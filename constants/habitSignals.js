// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Sinais de automaticidade (#285, fatia 0 do modelo de níveis).
//
// Lally et al. mediram automaticidade com questionário (SRHI). Não temos isso
// e não queremos: questionário é fricção, e o app inteiro é construído em
// cima de registro rápido. O que temos é registro com timestamp e quantidade.
//
// Daqui sai um **proxy comportamental**, não uma medida. Ver
// `docs/11-modelo-de-niveis.md` §5.
//
// ⚠️ Nesta fatia nada consome estes números: nenhum limiar, nenhum nível.
// São medição silenciosa, pra calibrar os limiares com dado real antes de
// pendurar consequência neles (§12). O cálculo pode estar errado sem machucar
// ninguém enquanto isso for verdade.

import { GOAL_KIND } from "./goals";

const MS_DIA = 86_400_000;

/** Chave de dia-calendário local (não UTC, porque o dia do usuário é o local). */
function diaLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Minutos desde a meia-noite local. */
function minutoDoDia(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Veredito por dia-calendário, do mais antigo pro mais recente.
 *
 * @param {Array<{type?: string, createdAt?: number, quantity?: number}>} records
 * @param {string} metric
 * @param {number} target
 * @param {number} days Tamanho da janela.
 * @param {number} [now] Epoch ms; injetável pra teste.
 * @returns {Array<{dia: string, total: number, hit: boolean}>} Sempre com
 *   `days` posições: dia sem registro entra como `total: 0, hit: false`.
 */
export function dailyVerdicts(records, metric, target, days, now = Date.now()) {
  const kind = GOAL_KIND[metric] ?? "sum";
  const porDia = new Map();

  for (const r of records ?? []) {
    if (r?.type !== metric) continue;
    const ts = Number(r.createdAt);
    if (!Number.isFinite(ts)) continue;
    const k = diaLocal(ts);
    const q = Number(r.quantity);
    porDia.set(k, {
      total: (porDia.get(k)?.total ?? 0) + (Number.isFinite(q) ? q : 0),
      n: (porDia.get(k)?.n ?? 0) + 1,
    });
  }

  const out = [];
  // Anda do dia mais antigo da janela até hoje, pra a ordem ser cronológica —
  // `resilience` depende disso pra saber o que é "dia seguinte".
  for (let i = days - 1; i >= 0; i--) {
    const k = diaLocal(now - i * MS_DIA);
    const info = porDia.get(k);
    const total = info?.total ?? 0;
    const n = info?.n ?? 0;
    // `presence`: houve registro basta. A quantidade não decide (§4, sono é
    // desfecho, não comportamento).
    const hit = kind === "presence" ? n > 0 : total >= target;
    out.push({ dia: k, total, hit });
  }
  return out;
}

/**
 * Consistência: fração de dias no alvo dentro da janela.
 *
 * @returns {{rate: number, hits: number, days: number}}
 */
export function consistency(verdicts) {
  const days = verdicts?.length ?? 0;
  if (!days) return { rate: 0, hits: 0, days: 0 };
  const hits = verdicts.filter((v) => v.hit).length;
  return { rate: hits / days, hits, days };
}

/**
 * Regularidade: quão estável é o horário do comportamento.
 *
 * Comportamento automático é disparado por contexto e acontece em horário
 * parecido; a dispersão cai conforme o hábito assenta. É o sinal menos óbvio
 * dos três e sai de graça, porque todo registro já tem `createdAt`.
 *
 * ⚠️ **Horário é circular, e desvio-padrão comum erra feio nele.** 23h50 e
 * 00h10 distam 20 minutos, não 23h40. Um `stddev` sobre "minutos desde a
 * meia-noite" trataria essas duas noites como caos absoluto, e o caso que
 * mais importa, o horário de deitar, vive exatamente em cima da meia-noite.
 *
 * Por isso a estatística é circular: cada horário vira um ângulo no relógio de
 * 24h, tira-se a média vetorial, e o comprimento do resultante `R` (0 a 1) diz
 * a concentração. `R` perto de 1 = sempre no mesmo horário. Daí sai um
 * desvio-padrão circular em minutos, que é o número legível.
 *
 * @param {Array<{type?: string, createdAt?: number}>} records
 * @param {string} metric
 * @param {number} days
 * @param {number} [now]
 * @returns {{resultant: number, sdMinutes: number|null, n: number}}
 *   `sdMinutes` é `null` quando não há amostra suficiente (n < 2).
 */
export function regularity(records, metric, days, now = Date.now()) {
  const limite = now - days * MS_DIA;
  const angulos = [];

  for (const r of records ?? []) {
    if (r?.type !== metric) continue;
    const ts = Number(r.createdAt);
    if (!Number.isFinite(ts) || ts < limite || ts > now) continue;
    angulos.push((2 * Math.PI * minutoDoDia(ts)) / 1440);
  }

  const n = angulos.length;
  if (n < 2) return { resultant: n === 1 ? 1 : 0, sdMinutes: null, n };

  let sx = 0;
  let sy = 0;
  for (const a of angulos) {
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  const resultant = Math.sqrt(sx * sx + sy * sy) / n;

  // R=0 seria dispersão total; o log divergiria. Trava num piso pra devolver
  // número em vez de Infinity: quem lê quer "muito irregular", não NaN.
  const R = Math.max(resultant, 1e-6);
  const sdRad = Math.sqrt(-2 * Math.log(R));
  const sdMinutes = (sdRad * 1440) / (2 * Math.PI);

  return { resultant, sdMinutes, n };
}

/**
 * Resiliência: depois de uma falha isolada, voltou no dia seguinte?
 *
 * Hábito automático se recupera sozinho; hábito frágil vira duas faltas, e a
 * segunda falta consecutiva é onde o laço quebra (§6). Este sinal mede
 * exatamente a diferença entre um tropeço e o começo de um hábito novo.
 *
 * ⚠️ **Oportunidade é só a falha ISOLADA**: a primeira de uma sequência, a
 * que vem logo depois de um dia no alvo. Contar toda falha faria uma recaída
 * longa pontuar como recuperação quando enfim acabasse: numa sequência
 * `alvo, falha, falha, alvo`, o segundo dia de queda "recuperou" no papel. O
 * que se quer medir é a diferença entre tropeçar e desabar.
 *
 * Falha no primeiro dia da janela não conta: sem o dia anterior não dá pra
 * saber se era isolada ou meio de uma sequência já em curso.
 *
 * Só conta oportunidades em que havia dia seguinte dentro da janela.
 *
 * `doubleMisses` é medida à parte e conta **todo** par de falhas consecutivas
 * porque essa é a regra de quebra da §6, não a de recuperação.
 *
 * @param {Array<{hit: boolean}>} verdicts Cronológico (saída de `dailyVerdicts`).
 * @returns {{rate: number|null, recovered: number, opportunities: number, doubleMisses: number}}
 *   `rate` é `null` quando não houve falha isolada, porque não dá pra afirmar nada
 *   sobre recuperação de quem nunca caiu.
 */
export function resilience(verdicts) {
  let recovered = 0;
  let opportunities = 0;
  let doubleMisses = 0;

  const v = verdicts ?? [];
  for (let i = 0; i < v.length - 1; i++) {
    if (!v[i].hit && !v[i + 1].hit) doubleMisses += 1;
    // Oportunidade = falha isolada: precedida por dia no alvo.
    if (v[i].hit || i === 0 || !v[i - 1].hit) continue;
    opportunities += 1;
    if (v[i + 1].hit) recovered += 1;
  }

  return {
    rate: opportunities ? recovered / opportunities : null,
    recovered,
    opportunities,
    doubleMisses,
  };
}

/**
 * Os três sinais de uma métrica, de uma vez.
 *
 * @returns {{metric: string, days: number, consistency: object, regularity: object, resilience: object}}
 */
export function habitSignals(records, metric, target, days, now = Date.now()) {
  const verdicts = dailyVerdicts(records, metric, target, days, now);
  return {
    metric,
    days,
    consistency: consistency(verdicts),
    regularity: regularity(records, metric, days, now),
    resilience: resilience(verdicts),
  };
}
