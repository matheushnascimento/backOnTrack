// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Metas por tipo do autocuidado (#395, fatia 3d da #374).
 *
 * Pra remédio quem faz esse papel é o plano (#392). Aqui ficam skincare,
 * terapia e outro, e só os tipos que a pessoa escolheu: meta de skincare pra
 * quem não faz skincare vira cobrança.
 *
 * ## Decisões de 30/10 (na #395)
 *
 * - **Cada tipo escolhe se a meta é por dia ou por semana.** Skincare 1 por
 *   dia, terapia 1 por semana.
 * - **A semana são os últimos 7 dias, contando hoje**, como na tela Semana.
 *   Nunca zera de repente: a terapia de quinta conta até a quarta seguinte.
 * - **A configuração fica na tela do autocuidado**, junto de onde se registra.
 *
 * ## Cifrada
 *
 * "Terapia 1 por semana" em claro revelaria o que os registros escondem. A
 * configuração inteira vai num campo cifrado só, num valor sincronizado. Dois
 * aparelhos mudando ao mesmo tempo: fica a última, como em qualquer valor.
 *
 * Dia que não bateu a meta não vira falha: o progresso só mostra o que foi
 * feito, sem cor de cobrança.
 */

import { decryptField, encryptField } from "./e2e";
import { diaLocal } from "./habitSignals";
import { diaDoRegistro, lerRegistro, rotuloDoTipo } from "./selfcare";

/** Os tipos que têm meta aqui, na ordem da tela. Remédio fica com o plano. */
export const TIPOS_COM_META = ["skincare", "terapia", "outro"];

export const PERIODOS = ["dia", "semana"];

/** Teto das vezes, pra um toque a mais no "+" não virar meta absurda. */
export const MAX_VEZES = { dia: 5, semana: 14 };

const CONTEXTO = "selfcare.metas";
const JANELA = 7;

/**
 * Só o que é válido: tipo conhecido, período conhecido e vezes inteiras
 * dentro do teto.
 *
 * @param {Record<string, {vezes: number, periodo: string}>} metas
 * @returns {Record<string, {vezes: number, periodo: "dia"|"semana"}>}
 */
export function normalizarMetas(metas) {
  const out = {};
  for (const tipo of TIPOS_COM_META) {
    const m = metas?.[tipo];
    if (!m || !PERIODOS.includes(m.periodo)) continue;
    const vezes = Math.floor(Number(m.vezes));
    if (!Number.isFinite(vezes) || vezes < 1) continue;
    out[tipo] = {
      vezes: Math.min(vezes, MAX_VEZES[m.periodo]),
      periodo: m.periodo,
    };
  }
  return out;
}

/**
 * O campo cifrado das metas. Sem nenhuma meta, volta vazio: não há o que
 * esconder, e vazio é o mesmo que nunca ter configurado.
 *
 * @param {{kid: string, dataKey: Uint8Array}} chave a do pacote principal
 * @param {Record<string, {vezes: number, periodo: string}>} metas
 * @returns {string}
 */
export function cifrarMetas(chave, metas) {
  const limpas = normalizarMetas(metas);
  if (Object.keys(limpas).length === 0) return "";
  return encryptField(chave, JSON.stringify(limpas), CONTEXTO);
}

/**
 * @param {Record<string, Uint8Array>} chaves
 * @param {string} protegido
 * @returns {{estado: "aberto", metas: ReturnType<typeof normalizarMetas>}|{estado: "travado"|"ilegivel"}}
 */
export function lerMetas(chaves, protegido) {
  if (!protegido) return { estado: "aberto", metas: {} };
  try {
    const metas = JSON.parse(decryptField(chaves, protegido, CONTEXTO));
    return { estado: "aberto", metas: normalizarMetas(metas) };
  } catch (e) {
    return { estado: e?.code === "chave-ausente" ? "travado" : "ilegivel" };
  }
}

/** Os últimos 7 dias, contando hoje, do mais antigo pro de hoje. */
function ultimosDias(now) {
  const hoje = new Date(now);
  return Array.from({ length: JANELA }, (_, i) =>
    diaLocal(
      new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - (JANELA - 1 - i),
        12,
      ).getTime(),
    ),
  );
}

/**
 * Quantos registros de cada tipo em cada dia da janela.
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {Record<string, object>} registros a tabela `records` crua
 * @param {string[]} dias
 * @returns {Record<string, Record<string, number>>} tipo → dia → quantos
 */
function contagens(chaves, registros, dias) {
  const naJanela = new Set(dias);
  const out = {};
  for (const r of Object.values(registros ?? {})) {
    if (r?.type !== "selfcare") continue;
    const dia = diaDoRegistro(r);
    if (!naJanela.has(dia)) continue;
    const lido = lerRegistro(chaves, r);
    if (lido.estado !== "aberto") continue;
    out[lido.tipo] ??= {};
    out[lido.tipo][dia] = (out[lido.tipo][dia] ?? 0) + 1;
  }
  return out;
}

/**
 * O progresso de cada meta, na ordem dos tipos.
 *
 * - por semana: `feitas` nos últimos 7 dias contra `vezes`;
 * - por dia: `hoje` contra `vezes`, e em quantos dos últimos 7 dias a meta
 *   do dia foi alcançada (`diasCumpridos`).
 *
 * @param {Record<string, Uint8Array>} chaves
 * @param {ReturnType<typeof normalizarMetas>} metas
 * @param {Record<string, object>} registros a tabela `records` crua
 * @param {number} [now]
 */
export function progressoDasMetas(chaves, metas, registros, now = Date.now()) {
  const dias = ultimosDias(now);
  const hoje = dias[dias.length - 1];
  const porTipo = contagens(chaves, registros, dias);
  return TIPOS_COM_META.filter((tipo) => metas?.[tipo]).map((tipo) => {
    const { vezes, periodo } = metas[tipo];
    const cont = porTipo[tipo] ?? {};
    if (periodo === "semana") {
      const feitas = dias.reduce((s, d) => s + (cont[d] ?? 0), 0);
      return { tipo, periodo, vezes, feitas, cumprida: feitas >= vezes };
    }
    const deHoje = cont[hoje] ?? 0;
    return {
      tipo,
      periodo,
      vezes,
      hoje: deHoje,
      cumprida: deHoje >= vezes,
      diasCumpridos: dias.filter((d) => (cont[d] ?? 0) >= vezes).length,
    };
  });
}

/**
 * A meta em palavras: "1 por semana", "2 por dia".
 *
 * @param {{vezes: number, periodo: string}} meta
 */
export function textoDaMeta({ vezes, periodo }) {
  return `${vezes} por ${periodo}`;
}

/**
 * O progresso em palavras, pra tela do autocuidado e pra Semana.
 *
 * @param {ReturnType<typeof progressoDasMetas>[number]} p
 */
export function textoDoProgresso(p) {
  if (p.periodo === "semana") {
    return `${p.feitas} de ${p.vezes} nos últimos 7 dias`;
  }
  const dias = p.diasCumpridos === 1 ? "1 dia" : `${p.diasCumpridos} dias`;
  return `hoje ${p.hoje} de ${p.vezes} · ${dias} na semana`;
}

/**
 * O progresso curto, pra linha da Home: "skincare 1/1 · terapia 0/1". Meta
 * por dia conta hoje, meta por semana conta os 7 dias.
 *
 * @param {ReturnType<typeof progressoDasMetas>} progresso
 * @returns {string|null}
 */
export function resumoDasMetas(progresso) {
  if (!progresso?.length) return null;
  return progresso
    .map(
      (p) =>
        `${rotuloDoTipo(p.tipo)} ${p.periodo === "semana" ? p.feitas : p.hoje}/${p.vezes}`,
    )
    .join(" · ");
}
