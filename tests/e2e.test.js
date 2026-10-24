// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Núcleo criptográfico ponta a ponta (#383, fatia 1 da #374).
//
// O que importa aqui é o que NÃO pode acontecer: chave em claro no pacote que
// vai pro servidor, senha errada que destranca, texto cifrado que decifra fora
// do lugar pra onde foi feito, dado adulterado que passa.

import {
  E2eError,
  KDF_PADRAO,
  createKeyBundle,
  decryptField,
  encryptField,
  formatRecoveryCode,
  fromBase64,
  isEncrypted,
  kidOf,
  parseRecoveryCode,
  rewrapPassword,
  toBase64,
  unlockWithPassword,
  unlockWithRecovery,
} from "@/constants/e2e";

// PBKDF2 leve pra suíte não levar minutos. O custo real é medido uma vez, no
// fim do arquivo.
const KDF_LEVE = { alg: "pbkdf2-sha256", c: 1000 };
const opcoes = { kdf: KDF_LEVE };

const iguais = (a, b) => Buffer.from(a).equals(Buffer.from(b));

/** O código do erro, ou null se não lançou. Aceita função síncrona ou não. */
async function codigoDoErro(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(E2eError);
    return e.code;
  }
}

describe("base64", () => {
  it("ida e volta bate com o Buffer do Node em todos os tamanhos", async () => {
    for (let n = 0; n <= 40; n++) {
      const bytes = Uint8Array.from(
        { length: n },
        (_, i) => (i * 37 + n) & 255,
      );
      const b64 = toBase64(bytes);
      expect(b64).toBe(Buffer.from(bytes).toString("base64"));
      expect(iguais(fromBase64(b64), bytes)).toBe(true);
    }
  });

  it("lixo vira dado-corrompido, e não bytes inventados", async () => {
    expect(await codigoDoErro(() => fromBase64("a$b"))).toBe("dado-corrompido");
  });
});

describe("código de recuperação", () => {
  const bytes = Uint8Array.from({ length: 20 }, (_, i) => i * 13);

  it("sai em 8 grupos de 4, só com o alfabeto Crockford", async () => {
    const codigo = formatRecoveryCode(bytes);
    expect(codigo).toMatch(
      /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/,
    );
  });

  it("volta aos mesmos bytes", async () => {
    expect(iguais(parseRecoveryCode(formatRecoveryCode(bytes)), bytes)).toBe(
      true,
    );
  });

  it("aceita como a pessoa digitar: minúsculas, sem hífen, com espaço", async () => {
    const codigo = formatRecoveryCode(bytes);
    const digitado = codigo.toLowerCase().replace(/-/g, " ");
    expect(iguais(parseRecoveryCode(digitado), bytes)).toBe(true);
  });

  it("aceita as trocas previstas pela Crockford: O por 0, I e L por 1", async () => {
    const codigo = formatRecoveryCode(bytes);
    const trocado = codigo.replace(/0/g, "O").replace(/1/g, "l");
    expect(iguais(parseRecoveryCode(trocado), bytes)).toBe(true);
  });

  it("tamanho ou caractere errado é código inválido", async () => {
    expect(await codigoDoErro(() => parseRecoveryCode("ABCD"))).toBe(
      "codigo-invalido",
    );
    const comU = "U".repeat(32);
    expect(await codigoDoErro(() => parseRecoveryCode(comU))).toBe(
      "codigo-invalido",
    );
  });
});

describe("pacote de chaves", () => {
  let bundle, dataKey, recoveryCode;
  beforeAll(async () => {
    ({ bundle, dataKey, recoveryCode } = await createKeyBundle(
      "pão de queijo",
      opcoes,
    ));
  });

  it("a senha destranca a mesma chave de dados", async () => {
    expect(
      iguais(await unlockWithPassword(bundle, "pão de queijo"), dataKey),
    ).toBe(true);
  });

  it("o código de recuperação também", async () => {
    expect(
      iguais(await unlockWithRecovery(bundle, recoveryCode), dataKey),
    ).toBe(true);
  });

  it("senha errada não destranca", async () => {
    expect(
      await codigoDoErro(() => unlockWithPassword(bundle, "pao de queijo")),
    ).toBe("nao-destrancou");
  });

  it("senha vazia nem tenta", async () => {
    expect(await codigoDoErro(() => unlockWithPassword(bundle, ""))).toBe(
      "senha-vazia",
    );
    expect(await codigoDoErro(() => createKeyBundle("", opcoes))).toBe(
      "senha-vazia",
    );
  });

  it("a mesma senha com acento composto de outro teclado destranca", async () => {
    // "ã" como um caractere só, ou como "a" + til combinante.
    const decomposta = "pão de queijo".normalize("NFD");
    expect(iguais(await unlockWithPassword(bundle, decomposta), dataKey)).toBe(
      true,
    );
  });

  it("o pacote não carrega a chave nem o código em claro", async () => {
    // É ele que vai pro servidor.
    const json = JSON.stringify(bundle);
    expect(json).not.toContain(toBase64(dataKey));
    expect(json).not.toContain(recoveryCode);
    expect(json).not.toContain(recoveryCode.replace(/-/g, ""));
  });

  it("a tranca da senha não serve no lugar da de recuperação", async () => {
    // O dado associado amarra cada tranca ao propósito dela.
    const trocado = { ...bundle, recuperacao: bundle.senha };
    expect(
      await codigoDoErro(() => unlockWithRecovery(trocado, recoveryCode)),
    ).toBe("nao-destrancou");
  });

  it("pacote de versão desconhecida é recusado", async () => {
    expect(
      await codigoDoErro(() => unlockWithPassword({ ...bundle, v: 2 }, "x")),
    ).toBe("versao-desconhecida");
  });

  it("duas pessoas com a mesma senha têm chaves e pacotes diferentes", async () => {
    const outro = await createKeyBundle("pão de queijo", opcoes);
    expect(iguais(outro.dataKey, dataKey)).toBe(false);
    expect(outro.bundle.kdf.salt).not.toBe(bundle.kdf.salt);
  });
});

describe("trocar a senha", () => {
  let dataKey, recoveryCode, novo;
  beforeAll(async () => {
    let bundle;
    ({ bundle, dataKey, recoveryCode } = await createKeyBundle(
      "antiga",
      opcoes,
    ));
    novo = await rewrapPassword(bundle, dataKey, "nova", opcoes);
  });

  it("a nova destranca a MESMA chave, sem recifrar nada", async () => {
    expect(iguais(await unlockWithPassword(novo, "nova"), dataKey)).toBe(true);
  });

  it("a antiga deixa de servir", async () => {
    expect(await codigoDoErro(() => unlockWithPassword(novo, "antiga"))).toBe(
      "nao-destrancou",
    );
  });

  it("o código de recuperação continua valendo", async () => {
    expect(iguais(await unlockWithRecovery(novo, recoveryCode), dataKey)).toBe(
      true,
    );
  });
});

describe("campos cifrados", () => {
  let minha, outra, chaves;
  beforeAll(async () => {
    const a = await createKeyBundle("x", opcoes);
    const b = await createKeyBundle("x", opcoes);
    minha = { kid: a.bundle.kid, dataKey: a.dataKey };
    outra = { kid: b.bundle.kid, dataKey: b.dataKey };
    chaves = { [minha.kid]: minha.dataKey };
  });

  it("ida e volta, com acento", async () => {
    const cifrado = encryptField(minha, "remédio às 08:10", "selfcare.kind");
    expect(isEncrypted(cifrado)).toBe(true);
    expect(decryptField(chaves, cifrado, "selfcare.kind")).toBe(
      "remédio às 08:10",
    );
  });

  it("o campo diz qual chave o cifrou", async () => {
    const cifrado = encryptField(minha, "remédio", "selfcare.kind");
    expect(kidOf(cifrado)).toBe(minha.kid);
    expect(cifrado.startsWith(`e2e1:${minha.kid}:`)).toBe(true);
  });

  it("o texto não aparece no valor cifrado", async () => {
    const cifrado = encryptField(minha, "remédio", "selfcare.kind");
    expect(cifrado).not.toContain("rem");
  });

  it("cifrar duas vezes o mesmo texto dá valores diferentes", async () => {
    // Nonce aleatório: sem isso, quem lê o servidor saberia quais registros
    // têm o mesmo conteúdo.
    const a = encryptField(minha, "remédio", "selfcare.kind");
    const b = encryptField(minha, "remédio", "selfcare.kind");
    expect(a).not.toBe(b);
  });

  it("copiado pra outro contexto, não decifra", async () => {
    const cifrado = encryptField(minha, "remédio", "selfcare.kind");
    expect(
      await codigoDoErro(() => decryptField(chaves, cifrado, "selfcare.note")),
    ).toBe("dado-corrompido");
  });

  it("campo de uma chave que o aparelho não tem: chave-ausente", async () => {
    // Diferente de dado corrompido: aqui o certo é pedir a senha, não acusar.
    const cifrado = encryptField(outra, "remédio", "selfcare.kind");
    expect(
      await codigoDoErro(() => decryptField(chaves, cifrado, "selfcare.kind")),
    ).toBe("chave-ausente");
  });

  it("trocar o kid do prefixo pra outra chave não passa", async () => {
    // O kid está no dado associado: apontar o campo pra outra chave que o
    // aparelho tem não faz ele decifrar com ela.
    const cifrado = encryptField(minha, "remédio", "selfcare.kind");
    const trocado = cifrado.replace(minha.kid, outra.kid);
    const ambas = { ...chaves, [outra.kid]: outra.dataKey };
    expect(
      await codigoDoErro(() => decryptField(ambas, trocado, "selfcare.kind")),
    ).toBe("dado-corrompido");
  });

  it("um caractere adulterado não passa", async () => {
    const cifrado = encryptField(minha, "remédio", "selfcare.kind");
    const i = cifrado.length - 5;
    const troca = cifrado[i] === "A" ? "B" : "A";
    const adulterado = cifrado.slice(0, i) + troca + cifrado.slice(i + 1);
    expect(
      await codigoDoErro(() =>
        decryptField(chaves, adulterado, "selfcare.kind"),
      ),
    ).toBe("dado-corrompido");
  });

  it("texto em claro não é tratado como cifrado", async () => {
    expect(isEncrypted("remédio")).toBe(false);
    expect(isEncrypted("e2e1:semkid")).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(kidOf("remédio")).toBeNull();
  });
});

describe("custo real do PBKDF2 (parâmetros da OWASP)", () => {
  // Mede, e não só confere. Aqui é o WebCrypto do Node, que é nativo como o
  // do navegador e o do react-native-quick-crypto. O Argon2id em JavaScript
  // foi descartado por isso: 14,7 s sem JIT, que é como o Hermes roda.
  it("cria e destranca com os parâmetros de produção", async () => {
    const t0 = Date.now();
    const { bundle, dataKey } = await createKeyBundle("senha real", {
      kdf: KDF_PADRAO,
    });
    const criar = Date.now() - t0;
    const t1 = Date.now();
    expect(
      iguais(await unlockWithPassword(bundle, "senha real"), dataKey),
    ).toBe(true);
    const destrancar = Date.now() - t1;
    console.log(
      `PBKDF2 600k pelo WebCrypto: criar ${criar}ms, destrancar ${destrancar}ms`,
    );
    expect(bundle.kdf).toMatchObject({ alg: "pbkdf2-sha256", c: 600_000 });
  }, 60_000);
});

describe("sem WebCrypto", () => {
  it("falha alto em vez de cair num caminho fraco", async () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    });
    try {
      expect(await codigoDoErro(() => createKeyBundle("x", opcoes))).toBe(
        "sem-webcrypto",
      );
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: original,
        configurable: true,
      });
    }
  });
});
