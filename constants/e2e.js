// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Criptografia ponta a ponta do autocuidado (#374, fatia 1 em #383).
 *
 * Remédio controlado é dado de saúde, e os registros sincronizam pra um
 * servidor que o administrador do app consegue ler. Aqui mora o que impede
 * isso: o servidor guarda só texto cifrado, e a chave existe só nos aparelhos
 * da pessoa.
 *
 * ## Modelo: envelope, como Bitwarden, Proton e 1Password
 *
 * - Uma **chave de dados** aleatória (256 bits) cifra os campos sensíveis.
 * - Ela vai pro servidor só **trancada**, duas vezes, num pacote de chaves:
 *   pela **senha** da pessoa (via PBKDF2) e por um **código de
 *   recuperação** mostrado uma única vez.
 * - Aparelho novo destranca com a senha. Quem esquecer a senha usa o código.
 *   Trocar a senha é retrancar a mesma chave, sem recifrar registro nenhum.
 * - Perder a senha E o código perde os registros cifrados. Não há como
 *   contornar isso sem deixar de ser ponta a ponta.
 *
 * ## O que isto protege, e o que não
 *
 * Protege contra quem lê o servidor: arquivos no disco, backups, logs,
 * vazamento. Não protege contra uma versão maliciosa do próprio app, que leria
 * os dados antes de cifrar. Isso vale pra qualquer app ponta a ponta cujo
 * cliente é publicado pelo mesmo dono do servidor.
 *
 * ## Primitivas
 *
 * - XChaCha20-Poly1305 (`@noble/ciphers`): cifra autenticada, padrão do
 *   libsodium. O nonce de 24 bytes é grande o bastante pra ser aleatório sem
 *   risco de repetição, que é o que torna seguro cifrar em vários aparelhos
 *   sem coordenar contador.
 * - PBKDF2-SHA256 com 600 mil iterações (número da OWASP, padrão do
 *   Bitwarden), pelo **WebCrypto** da plataforma. Tem que ser nativo: o
 *   Argon2id em JavaScript levou 355 ms no Node com JIT e 14,7 s sem JIT, que é
 *   a aproximação do Hermes. Destrancar levaria de 5 a 15 s no aparelho, e
 *   baixar os parâmetros não é saída, porque a força da derivação é o que
 *   protege a senha de quem tem o pacote, que é o próprio servidor. O
 *   algoritmo fica gravado no pacote, pra poder trocar depois. No navegador o
 *   WebCrypto já existe (só em https ou localhost); no app, a fatia 2 instala o
 *   do `react-native-quick-crypto`. Sem ele, falha alto em vez de cair num
 *   caminho fraco.
 * - HKDF-SHA256 pro código de recuperação, também pelo WebCrypto: o código
 *   já tem 160 bits de entropia, então não precisa de derivação lenta.
 *
 * Tudo cifrado leva **dado associado** com o propósito ("senha",
 * "recuperação", o contexto do campo). Isso impede reaproveitar um texto
 * cifrado num lugar pra onde ele não foi feito.
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
  bytesToUtf8,
  concatBytes,
  randomBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils.js";

export const E2E_VERSION = 1;

/** Prefixo dos campos cifrados, com a versão do formato. */
const PREFIXO = "e2e1:";

/**
 * PBKDF2-SHA256, 600 mil iterações: o mínimo da OWASP pra SHA-256, e o padrão
 * do Bitwarden. Fica gravado no pacote; subir depois só afeta pacotes novos ou
 * retrancados.
 */
export const KDF_PADRAO = { alg: "pbkdf2-sha256", c: 600_000 };

const TAM_CHAVE = 32;
const TAM_NONCE = 24;
const TAM_SAL = 16;
const TAM_RECUPERACAO = 20; // 160 bits = 32 caracteres base32

/** Erro com motivo legível pela tela. */
export class E2eError extends Error {
  /** @param {"senha-vazia"|"nao-destrancou"|"codigo-invalido"|"dado-corrompido"|"versao-desconhecida"|"sem-webcrypto"} code */
  constructor(code, message) {
    super(message ?? code);
    this.name = "E2eError";
    this.code = code;
  }
}

// --- base64 (RFC 4648) ---------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** @param {Uint8Array} bytes */
export function toBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n =
      (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

/** @param {string} texto */
export function fromBase64(texto) {
  const limpo = String(texto ?? "").replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/]*$/.test(limpo) || limpo.length % 4 === 1) {
    throw new E2eError("dado-corrompido", "base64 inválido");
  }
  const out = new Uint8Array(Math.floor((limpo.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let j = 0;
  for (const c of limpo) {
    buf = (buf << 6) | B64.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[j++] = (buf >> bits) & 255;
    }
  }
  return out;
}

// --- código de recuperação (base32 Crockford) ----------------------------

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * 20 bytes em 8 grupos de 4: "7KQ2-MX9F-...". Base32 Crockford porque o
 * código é escrito à mão: sem I, L, O e U, que se confundem com 1, 0 e V.
 *
 * @param {Uint8Array} bytes
 */
export function formatRecoveryCode(bytes) {
  let bits = 0;
  let buf = 0;
  let out = "";
  for (const b of bytes) {
    buf = (buf << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(buf >> bits) & 31];
    }
  }
  if (bits > 0) out += CROCKFORD[(buf << (5 - bits)) & 31];
  return out.match(/.{1,4}/g).join("-");
}

/**
 * Lê o código como a pessoa digitar: minúsculas, sem hífen, com espaços, e
 * com as trocas que a Crockford prevê (O vira 0; I e L viram 1).
 *
 * @param {string} texto
 * @returns {Uint8Array}
 */
export function parseRecoveryCode(texto) {
  const limpo = String(texto ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  const esperado = Math.ceil((TAM_RECUPERACAO * 8) / 5);
  if (limpo.length !== esperado) {
    throw new E2eError(
      "codigo-invalido",
      `o código tem ${esperado} caracteres`,
    );
  }
  const out = new Uint8Array(TAM_RECUPERACAO);
  let bits = 0;
  let buf = 0;
  let j = 0;
  for (const c of limpo) {
    const v = CROCKFORD.indexOf(c);
    if (v === -1) throw new E2eError("codigo-invalido", `caractere ${c}`);
    buf = (buf << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      if (j < out.length) out[j++] = (buf >> bits) & 255;
    }
  }
  return out;
}

// --- derivação de chaves -------------------------------------------------

/** O WebCrypto da plataforma, ou erro explícito. */
function subtle() {
  const s = globalThis.crypto?.subtle;
  if (!s) {
    // No app: falta o react-native-quick-crypto (fatia 2). No navegador: a
    // página não está em https nem em localhost. Nos dois casos, falhar é o
    // certo; um caminho "de reserva" em JavaScript seria lento demais.
    throw new E2eError(
      "sem-webcrypto",
      "WebCrypto indisponível neste ambiente",
    );
  }
  return s;
}

/** Chave que tranca a chave de dados, a partir da senha. */
async function chaveDaSenha(senha, kdf, sal) {
  if (kdf.alg !== "pbkdf2-sha256") {
    throw new E2eError("versao-desconhecida", `kdf ${kdf.alg}`);
  }
  // NFC: a mesma senha digitada em teclados diferentes ("é" composto ou não)
  // tem que dar a mesma chave.
  const bytes = utf8ToBytes(String(senha).normalize("NFC"));
  const base = await subtle().importKey("raw", bytes, "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: kdf.c },
    base,
    TAM_CHAVE * 8,
  );
  return new Uint8Array(bits);
}

/** Chave que tranca a chave de dados, a partir do código de recuperação. */
async function chaveDoCodigo(codigoBytes, sal) {
  const base = await subtle().importKey("raw", codigoBytes, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await subtle().deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: sal,
      info: utf8ToBytes("bot-e2e-v1:recuperacao"),
    },
    base,
    TAM_CHAVE * 8,
  );
  return new Uint8Array(bits);
}

const AAD = {
  senha: utf8ToBytes("bot-e2e-v1:tranca:senha"),
  recuperacao: utf8ToBytes("bot-e2e-v1:tranca:recuperacao"),
  campo: (contexto) => utf8ToBytes(`bot-e2e-v1:campo:${contexto}`),
};

function trancar(chave, conteudo, aad, random) {
  const nonce = random(TAM_NONCE);
  const ct = xchacha20poly1305(chave, nonce, aad).encrypt(conteudo);
  return { nonce: toBase64(nonce), ct: toBase64(ct) };
}

function destrancar(chave, { nonce, ct }, aad) {
  try {
    return xchacha20poly1305(chave, fromBase64(nonce), aad).decrypt(
      fromBase64(ct),
    );
  } catch {
    // AEAD não diz se foi chave errada ou dado adulterado, e não deve dizer:
    // distinguir os dois ajudaria quem tenta adivinhar.
    return null;
  }
}

// --- pacote de chaves ------------------------------------------------------

/**
 * Cria a chave de dados da pessoa e o pacote que a guarda trancada.
 *
 * O pacote pode ir pro servidor: sem a senha ou o código, ele não serve pra
 * nada. A chave de dados e o código de recuperação NÃO podem: a chave fica no
 * cofre do aparelho, e o código é mostrado uma vez pra pessoa guardar.
 *
 * @param {string} senha
 * @param {{random?: (n: number) => Uint8Array, kdf?: typeof KDF_PADRAO}} [opcoes]
 * @returns {Promise<{bundle: object, dataKey: Uint8Array, recoveryCode: string}>}
 */
export async function createKeyBundle(
  senha,
  { random = randomBytes, kdf = KDF_PADRAO } = {},
) {
  if (!senha) throw new E2eError("senha-vazia");
  const dataKey = random(TAM_CHAVE);
  const codigo = random(TAM_RECUPERACAO);
  const sal = random(TAM_SAL);
  const bundle = {
    v: E2E_VERSION,
    kdf: { ...kdf, salt: toBase64(sal) },
    senha: trancar(
      await chaveDaSenha(senha, kdf, sal),
      dataKey,
      AAD.senha,
      random,
    ),
    recuperacao: trancar(
      await chaveDoCodigo(codigo, sal),
      dataKey,
      AAD.recuperacao,
      random,
    ),
  };
  return { bundle, dataKey, recoveryCode: formatRecoveryCode(codigo) };
}

function conferirVersao(bundle) {
  if (bundle?.v !== E2E_VERSION) {
    throw new E2eError("versao-desconhecida", `pacote v${bundle?.v}`);
  }
}

/**
 * Destranca a chave de dados com a senha.
 *
 * Lento de propósito (600 mil iterações): é o custo que torna inviável
 * testar senhas em massa com o pacote vazado.
 *
 * @returns {Promise<Uint8Array>} a chave de dados
 */
export async function unlockWithPassword(bundle, senha) {
  conferirVersao(bundle);
  if (!senha) throw new E2eError("senha-vazia");
  const sal = fromBase64(bundle.kdf.salt);
  const dataKey = destrancar(
    await chaveDaSenha(senha, bundle.kdf, sal),
    bundle.senha,
    AAD.senha,
  );
  if (!dataKey) throw new E2eError("nao-destrancou");
  return dataKey;
}

/** Destranca a chave de dados com o código de recuperação. */
export async function unlockWithRecovery(bundle, codigo) {
  conferirVersao(bundle);
  const sal = fromBase64(bundle.kdf.salt);
  const dataKey = destrancar(
    await chaveDoCodigo(parseRecoveryCode(codigo), sal),
    bundle.recuperacao,
    AAD.recuperacao,
  );
  if (!dataKey) throw new E2eError("nao-destrancou");
  return dataKey;
}

/**
 * Troca a senha: retranca a MESMA chave de dados com a senha nova.
 *
 * Nenhum registro é recifrado, e o código de recuperação continua valendo.
 * Mantém o sal: ele é público e só serve pra a mesma senha não dar a mesma
 * chave em pessoas diferentes.
 */
export async function rewrapPassword(
  bundle,
  dataKey,
  novaSenha,
  { random = randomBytes } = {},
) {
  conferirVersao(bundle);
  if (!novaSenha) throw new E2eError("senha-vazia");
  const sal = fromBase64(bundle.kdf.salt);
  return {
    ...bundle,
    senha: trancar(
      await chaveDaSenha(novaSenha, bundle.kdf, sal),
      dataKey,
      AAD.senha,
      random,
    ),
  };
}

// --- campos cifrados -----------------------------------------------------

/** O valor é um campo cifrado por este módulo? */
export function isEncrypted(valor) {
  return typeof valor === "string" && valor.startsWith(PREFIXO);
}

/**
 * Cifra um texto pra guardar num campo do registro.
 *
 * `contexto` entra como dado associado: um campo cifrado pra "selfcare.kind"
 * não decifra se for copiado pra outro lugar.
 *
 * @param {Uint8Array} dataKey
 * @param {string} texto
 * @param {string} contexto
 * @returns {string} "e2e1:<base64 de nonce + texto cifrado>"
 */
export function encryptField(
  dataKey,
  texto,
  contexto,
  { random = randomBytes } = {},
) {
  const nonce = random(TAM_NONCE);
  const ct = xchacha20poly1305(dataKey, nonce, AAD.campo(contexto)).encrypt(
    utf8ToBytes(String(texto)),
  );
  return PREFIXO + toBase64(concatBytes(nonce, ct));
}

/** Decifra um campo; lança `dado-corrompido` se não fechar. */
export function decryptField(dataKey, valor, contexto) {
  if (!isEncrypted(valor)) {
    throw new E2eError("versao-desconhecida", "campo sem prefixo e2e1");
  }
  const bruto = fromBase64(valor.slice(PREFIXO.length));
  try {
    const texto = xchacha20poly1305(
      dataKey,
      bruto.subarray(0, TAM_NONCE),
      AAD.campo(contexto),
    ).decrypt(bruto.subarray(TAM_NONCE));
    return bytesToUtf8(texto);
  } catch {
    throw new E2eError("dado-corrompido");
  }
}
