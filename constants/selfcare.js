// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Autocuidado, a 6ª métrica (#374, fatia 3a).
 *
 * Remédio, skincare, terapia ou outro cuidado. Fica FORA da jornada por
 * enquanto (decisão de 24/10): aparece na Home e no histórico, mas não vira
 * hábito com nível.
 *
 * ## O que vai cifrado, e o que fica em claro
 *
 * O tipo e a nota vão juntos num campo cifrado ponta a ponta (`protegido`),
 * porque são eles que revelam saúde: "remédio" já diz o bastante, e a nota é
 * onde alguém escreveria o nome dele. A coluna `note` do registro, que viaja
 * em claro, fica vazia de propósito.
 *
 * Em claro fica só o que a Home e o sync precisam: a data, a hora do registro
 * e a quantidade 1. O servidor sabe que a pessoa cuidou de si numa terça às
 * 8h, e não o quê.
 */

import { decryptField, encryptField } from "./e2e";

/** Tipos de autocuidado, na ordem em que aparecem na tela. */
export const SELFCARE_TIPOS = [
  { key: "remedio", label: "remédio" },
  { key: "skincare", label: "skincare" },
  { key: "terapia", label: "terapia" },
  { key: "outro", label: "outro" },
];

/**
 * Contexto do campo cifrado. Entra como dado associado: o conteúdo cifrado
 * aqui não decifra se for copiado pra outro campo.
 */
const CONTEXTO = "selfcare.registro";

/** Rótulo do tipo, ou o próprio valor se for desconhecido. */
export function rotuloDoTipo(tipo) {
  return SELFCARE_TIPOS.find((t) => t.key === tipo)?.label ?? String(tipo);
}

/**
 * O campo cifrado de um registro novo ou editado.
 *
 * @param {{kid: string, dataKey: Uint8Array}} chave a do pacote principal
 * @param {{tipo: string, nota?: string}} conteudo
 * @returns {string}
 */
export function cifrarRegistro(chave, { tipo, nota = "" }) {
  if (!SELFCARE_TIPOS.some((t) => t.key === tipo)) {
    throw new Error(`tipo de autocuidado desconhecido: ${tipo}`);
  }
  return encryptField(
    chave,
    JSON.stringify({ tipo, nota: String(nota).trim() }),
    CONTEXTO,
  );
}

/** O campo `protegido` do registro, hidratado ou linha crua do `useTable`. */
function protegidoDe(registro) {
  if (registro?.protegido != null) return registro.protegido;
  try {
    return JSON.parse(registro?.details ?? "")?.protegido;
  } catch {
    return undefined;
  }
}

/**
 * O que dá pra mostrar de um registro.
 *
 * - `aberto`: o aparelho tem a chave, e aí vêm tipo e nota;
 * - `travado`: o registro é cifrado com uma chave que o aparelho não tem
 *   destrancada, e o certo é pedir a senha;
 * - `ilegivel`: tem a chave e o conteúdo não fecha (adulterado ou corrompido).
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {object} registro
 * @returns {{estado: "aberto", tipo: string, nota: string}|{estado: "travado"|"ilegivel"}}
 */
export function lerRegistro(chaves, registro) {
  const protegido = protegidoDe(registro);
  if (!protegido) return { estado: "ilegivel" };
  try {
    const { tipo, nota } = JSON.parse(
      decryptField(chaves, protegido, CONTEXTO),
    );
    return { estado: "aberto", tipo, nota: nota ?? "" };
  } catch (e) {
    return { estado: e?.code === "chave-ausente" ? "travado" : "ilegivel" };
  }
}
