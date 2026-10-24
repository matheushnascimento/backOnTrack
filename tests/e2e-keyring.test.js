// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Chaveiro da criptografia ponta a ponta (#388).
//
// O caso que justifica o desenho: dois pacotes na mesma conta, criados numa
// corrida. Nada pode ficar ilegível.

import { createKeyBundle, decryptField, encryptField } from "@/constants/e2e";
import {
  MIN_SENHA,
  bundlesDaTabela,
  destrancarComCodigo,
  destrancarTodas,
  lerChaves,
  pacotePrincipal,
  podeCriar,
  serializarChaves,
  statusDaProtecao,
  validarSenhaNova,
} from "@/constants/e2eKeyring";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };
const iguais = (a, b) => Buffer.from(a).equals(Buffer.from(b));

/** Linha da tabela como o store guarda. */
const linha = (bundle, createdAt) => ({
  bundle: JSON.stringify(bundle),
  createdAt,
});

describe("bundlesDaTabela", () => {
  it("ordena do mais antigo pro mais novo", async () => {
    const a = await createKeyBundle("x", opcoes);
    const b = await createKeyBundle("x", opcoes);
    const lista = bundlesDaTabela({
      [b.bundle.kid]: linha(b.bundle, 200),
      [a.bundle.kid]: linha(a.bundle, 100),
    });
    expect(lista.map((x) => x.kid)).toEqual([a.bundle.kid, b.bundle.kid]);
    expect(pacotePrincipal(lista).kid).toBe(a.bundle.kid);
  });

  it("empate de horário escolhe o mesmo em todo aparelho", async () => {
    const a = await createKeyBundle("x", opcoes);
    const b = await createKeyBundle("x", opcoes);
    const um = bundlesDaTabela({
      1: linha(a.bundle, 100),
      2: linha(b.bundle, 100),
    });
    const outro = bundlesDaTabela({
      2: linha(b.bundle, 100),
      1: linha(a.bundle, 100),
    });
    expect(pacotePrincipal(um).kid).toBe(pacotePrincipal(outro).kid);
  });

  it("linha quebrada é ignorada sem derrubar as outras", async () => {
    const a = await createKeyBundle("x", opcoes);
    const lista = bundlesDaTabela({
      ruim: { bundle: "{não é json", createdAt: 1 },
      boa: linha(a.bundle, 2),
    });
    expect(lista.map((x) => x.kid)).toEqual([a.bundle.kid]);
  });

  it("tabela vazia: sem pacote", () => {
    expect(bundlesDaTabela({})).toEqual([]);
    expect(bundlesDaTabela(undefined)).toEqual([]);
    expect(pacotePrincipal([])).toBeNull();
  });
});

describe("statusDaProtecao", () => {
  const bundles = [{ kid: "aa" }, { kid: "bb" }];

  it("sem pacote: sem proteção", () => {
    expect(statusDaProtecao({ bundles: [], chaves: {} })).toBe("sem-protecao");
  });

  it("com a chave do principal: destravado", () => {
    expect(
      statusDaProtecao({ bundles, chaves: { aa: new Uint8Array(32) } }),
    ).toBe("destravado");
  });

  it("só com a chave de um pacote secundário: travado", () => {
    // Dado novo é cifrado com o principal; sem ele, falta destrancar.
    expect(
      statusDaProtecao({ bundles, chaves: { bb: new Uint8Array(32) } }),
    ).toBe("travado");
  });
});

describe("podeCriar", () => {
  it("com login, sync conectado e conta sem pacote: pode", () => {
    expect(podeCriar({ bundles: [], logado: true, syncOnline: true })).toEqual({
      ok: true,
      motivo: null,
    });
  });

  it("a conta já tem pacote: não cria outro", () => {
    expect(
      podeCriar({ bundles: [{ kid: "aa" }], logado: true, syncOnline: true })
        .motivo,
    ).toBe("ja-existe");
  });

  it("deslogado: não, colidiria com o da conta no primeiro login", () => {
    expect(
      podeCriar({ bundles: [], logado: false, syncOnline: true }).motivo,
    ).toBe("sem-login");
  });

  it("sem sync: não, o pacote da conta talvez ainda não tenha chegado", () => {
    expect(
      podeCriar({ bundles: [], logado: true, syncOnline: false }).motivo,
    ).toBe("sem-sync");
  });
});

describe("validarSenhaNova", () => {
  it(`menos de ${MIN_SENHA} caracteres não serve`, () => {
    expect(validarSenhaNova("curta", "curta")).toMatch(/pelo menos/);
  });

  it("as duas têm que ser iguais", () => {
    expect(validarSenhaNova("senha boa 1", "senha boa 2")).toMatch(/iguais/);
  });

  it("senha boa e igual: sem problema", () => {
    expect(validarSenhaNova("senha boa 1", "senha boa 1")).toBeNull();
  });
});

describe("a corrida de criação não perde nada", () => {
  // Dois aparelhos criaram a proteção ao mesmo tempo, com a mesma senha. Cada
  // um cifrou um registro com a própria chave.
  let a, b, bundles;
  beforeAll(async () => {
    a = await createKeyBundle("mesma senha", opcoes);
    b = await createKeyBundle("mesma senha", opcoes);
    bundles = bundlesDaTabela({
      [a.bundle.kid]: linha(a.bundle, 100),
      [b.bundle.kid]: linha(b.bundle, 101),
    });
  });

  it("a senha destranca as duas chaves", async () => {
    const chaves = await destrancarTodas(bundles, "mesma senha");
    expect(Object.keys(chaves).sort()).toEqual(
      [a.bundle.kid, b.bundle.kid].sort(),
    );
  });

  it("e os registros de cada aparelho continuam legíveis", async () => {
    const doA = encryptField(
      { kid: a.bundle.kid, dataKey: a.dataKey },
      "tomei",
      "selfcare.kind",
    );
    const doB = encryptField(
      { kid: b.bundle.kid, dataKey: b.dataKey },
      "tomei",
      "selfcare.kind",
    );
    const chaves = await destrancarTodas(bundles, "mesma senha");
    expect(decryptField(chaves, doA, "selfcare.kind")).toBe("tomei");
    expect(decryptField(chaves, doB, "selfcare.kind")).toBe("tomei");
  });
});

describe("destrancarTodas", () => {
  it("senha errada não destranca nenhum", async () => {
    const a = await createKeyBundle("certa", opcoes);
    const bundles = bundlesDaTabela({ x: linha(a.bundle, 1) });
    await expect(destrancarTodas(bundles, "errada")).rejects.toMatchObject({
      code: "nao-destrancou",
    });
  });

  it("senhas diferentes por pacote: guarda só o que abriu", async () => {
    const a = await createKeyBundle("senha A", opcoes);
    const b = await createKeyBundle("senha B", opcoes);
    const bundles = bundlesDaTabela({
      1: linha(a.bundle, 1),
      2: linha(b.bundle, 2),
    });
    const chaves = await destrancarTodas(bundles, "senha B");
    expect(Object.keys(chaves)).toEqual([b.bundle.kid]);
  });
});

describe("destrancarComCodigo", () => {
  it("acha o pacote do código entre vários", async () => {
    const a = await createKeyBundle("x", opcoes);
    const b = await createKeyBundle("x", opcoes);
    const bundles = bundlesDaTabela({
      1: linha(a.bundle, 1),
      2: linha(b.bundle, 2),
    });
    const achado = await destrancarComCodigo(bundles, b.recoveryCode);
    expect(achado.kid).toBe(b.bundle.kid);
    expect(iguais(achado.dataKey, b.dataKey)).toBe(true);
  });

  it("código de nenhum pacote não destranca", async () => {
    const a = await createKeyBundle("x", opcoes);
    const outro = await createKeyBundle("x", opcoes);
    const bundles = bundlesDaTabela({ 1: linha(a.bundle, 1) });
    await expect(
      destrancarComCodigo(bundles, outro.recoveryCode),
    ).rejects.toMatchObject({ code: "nao-destrancou" });
  });
});

describe("cofre do aparelho", () => {
  it("ida e volta das chaves", async () => {
    const a = await createKeyBundle("x", opcoes);
    const lidas = lerChaves(serializarChaves({ [a.bundle.kid]: a.dataKey }));
    expect(iguais(lidas[a.bundle.kid], a.dataKey)).toBe(true);
  });

  it("conteúdo quebrado vira cofre vazio, e não erro", () => {
    expect(lerChaves("{quebrado")).toEqual({});
    expect(lerChaves(null)).toEqual({});
  });
});
