// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Chaveiro da criptografia ponta a ponta (#388, fatia 2 da #374).
 *
 * Fica entre o núcleo (`constants/e2e.js`) e as telas: lê os pacotes de chave,
 * diz em que estado a proteção está, decide quem pode criar uma, e destranca.
 *
 * ## Uma tabela de pacotes, e não um valor único
 *
 * O pacote de chaves sincroniza, e num aparelho novo ele chega pelo sync, não
 * na hora. Se ele morasse num valor único, criar a proteção antes de ele
 * chegar SOBRESCREVERIA o pacote antigo (no store sincronizado a última
 * escrita vence), e tudo o que foi cifrado com a chave antiga ficaria
 * ilegível pra sempre.
 *
 * Por isso cada pacote é uma linha, com o `kid` como id. Criar acrescenta, e
 * nunca sobrescreve. No pior caso de uma corrida, a conta fica com duas
 * chaves, e nada se perde:
 *
 * - os campos cifrados dizem qual chave os cifrou (`kid` no prefixo);
 * - destrancar com a senha tenta todos os pacotes e guarda as chaves que
 *   abrirem;
 * - pra cifrar dado novo, todo aparelho usa o pacote MAIS ANTIGO, e assim
 *   todos convergem pra mesma chave.
 *
 * A guarda de `podeCriar` (login e sync conectado) é a primeira linha de
 * defesa: torna a corrida rara. A tabela é a segunda: torna a corrida
 * inofensiva.
 */

import {
  E2eError,
  fromBase64,
  toBase64,
  unlockWithPassword,
  unlockWithRecovery,
} from "./e2e";

/** Tamanho mínimo da senha de proteção. */
export const MIN_SENHA = 8;

/**
 * Os pacotes da tabela, do mais antigo pro mais novo.
 *
 * Linha com JSON quebrado é ignorada em vez de derrubar a tela: um pacote
 * ilegível não destranca nada, e os outros continuam valendo.
 *
 * @param {Record<string, {bundle?: string, createdAt?: number}>} tabela
 * @returns {Array<{kid: string, bundle: object, createdAt: number}>}
 */
export function bundlesDaTabela(tabela) {
  const lista = [];
  for (const linha of Object.values(tabela ?? {})) {
    try {
      const bundle = JSON.parse(linha?.bundle ?? "");
      if (!bundle?.kid) continue;
      lista.push({
        kid: bundle.kid,
        bundle,
        createdAt: Number(linha.createdAt) || 0,
      });
    } catch {
      // ignora a linha
    }
  }
  // Empate de horário cai no kid, pra todo aparelho escolher o mesmo.
  return lista.sort(
    (a, b) => a.createdAt - b.createdAt || a.kid.localeCompare(b.kid),
  );
}

/** O pacote que cifra dado novo: o mais antigo. `null` sem pacote. */
export function pacotePrincipal(bundles) {
  return bundles?.[0] ?? null;
}

/**
 * Em que estado a proteção está neste aparelho.
 *
 * @param {{bundles: Array<{kid: string}>, chaves: Record<string, Uint8Array>}} args
 * @returns {"sem-protecao"|"travado"|"destravado"}
 */
export function statusDaProtecao({ bundles, chaves }) {
  const principal = pacotePrincipal(bundles);
  if (!principal) return "sem-protecao";
  return chaves?.[principal.kid] ? "destravado" : "travado";
}

/**
 * A pessoa pode criar uma proteção agora?
 *
 * Só com login e com o sync conectado. Deslogado, o pacote ficaria só no
 * aparelho e colidiria com o da conta no primeiro login. Sem sync, o pacote
 * que a conta já tenha talvez ainda não tenha chegado.
 *
 * @param {{bundles: Array, logado: boolean, syncOnline: boolean}} args
 * @returns {{ok: boolean, motivo: null|"ja-existe"|"sem-login"|"sem-sync"}}
 */
export function podeCriar({ bundles, logado, syncOnline }) {
  if (bundles?.length > 0) return { ok: false, motivo: "ja-existe" };
  if (!logado) return { ok: false, motivo: "sem-login" };
  if (!syncOnline) return { ok: false, motivo: "sem-sync" };
  return { ok: true, motivo: null };
}

/**
 * Mensagem do problema da senha nova, ou `null` se ela serve.
 *
 * @param {string} senha
 * @param {string} confirmacao
 */
export function validarSenhaNova(senha, confirmacao) {
  if (String(senha ?? "").length < MIN_SENHA) {
    return `Use pelo menos ${MIN_SENHA} caracteres.`;
  }
  if (senha !== confirmacao) return "As duas senhas não são iguais.";
  return null;
}

/**
 * Destranca TODOS os pacotes que a senha abrir.
 *
 * Normalmente é um só. Mais de um só acontece numa corrida de criação, e aí a
 * mesma senha costuma abrir os dois; guardar todos é o que mantém legível o
 * que cada um cifrou.
 *
 * @param {Array<{kid: string, bundle: object}>} bundles
 * @param {string} senha
 * @returns {Promise<Record<string, Uint8Array>>} `kid` → chave de dados
 * @throws {E2eError} `nao-destrancou` se nenhum abrir
 */
export async function destrancarTodas(bundles, senha) {
  const chaves = {};
  for (const { kid, bundle } of bundles ?? []) {
    try {
      chaves[kid] = await unlockWithPassword(bundle, senha);
    } catch (e) {
      // Senha vazia ou sem WebCrypto valem pra todos: não adianta seguir.
      if (e?.code !== "nao-destrancou") throw e;
    }
  }
  if (Object.keys(chaves).length === 0) throw new E2eError("nao-destrancou");
  return chaves;
}

/**
 * Destranca com o código de recuperação: o código é de UM pacote, então
 * procura qual.
 *
 * @returns {Promise<{kid: string, bundle: object, dataKey: Uint8Array}>}
 */
export async function destrancarComCodigo(bundles, codigo) {
  for (const { kid, bundle } of bundles ?? []) {
    try {
      const dataKey = await unlockWithRecovery(bundle, codigo);
      return { kid, bundle, dataKey };
    } catch (e) {
      if (e?.code !== "nao-destrancou") throw e;
    }
  }
  throw new E2eError("nao-destrancou");
}

/** Chaves pro cofre do aparelho: `{kid: base64}` em JSON. */
export function serializarChaves(chaves) {
  const obj = {};
  for (const [kid, dataKey] of Object.entries(chaves ?? {})) {
    obj[kid] = toBase64(dataKey);
  }
  return JSON.stringify(obj);
}

/** Lê o que o cofre guardou. Conteúdo quebrado vira cofre vazio. */
export function lerChaves(json) {
  try {
    const obj = JSON.parse(json ?? "");
    const chaves = {};
    for (const [kid, b64] of Object.entries(obj ?? {})) {
      chaves[kid] = fromBase64(b64);
    }
    return chaves;
  } catch {
    return {};
  }
}
