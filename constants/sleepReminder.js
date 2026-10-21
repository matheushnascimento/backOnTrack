// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Lembrete do sono que aprende o horário pelos registros (#368).
 *
 * Dois lembretes por noite, derivados do comportamento real em vez de um campo
 * em Ajustes:
 *
 * - **deitar:** 30 min ANTES do deitar típico. No horário mediano exato,
 *   metade das noites a pessoa já estaria deitada e teria que pegar o celular
 *   na cama, que é o contrário do hábito.
 * - **acordar:** 30 min DEPOIS do acordar típico, pra registrar a noite.
 *
 * ## Horário típico é mediana circular
 *
 * A moda de horário exato empata em tudo com poucas noites, e a média é puxada
 * por uma única noite fora da curva. A mediana aguenta as duas coisas.
 *
 * Circular pelo mesmo motivo do §5 (ver `regularity` em `habitSignals.js`):
 * 23:50 e 00:10 distam 20 minutos, e uma mediana em "minutos desde a
 * meia-noite" trataria as duas como os extremos opostos da distribuição.
 *
 * ## Consequência aceita
 *
 * Aprender do comportamento acompanha a pessoa. Se ela passar a deitar mais
 * tarde, o lembrete vai junto. Isso reforça regularidade, que é o que o §5
 * mede, e não puxa o horário pra cedo.
 *
 * Isolado como função pura pelo motivo de sempre: o `expo-notifications` não
 * roda no jest, e a regra inteira dá pra testar sem ele.
 */

import { diaLocal } from "./habitSignals";
import { bedOf, nightInstant, parseHHMM, wakeOf } from "./sleepTimes";

const MIN_POR_DIA = 1440;
const MS_DIA = 86_400_000;

/** Quantas noites com horário, no mínimo, antes de confiar na mediana. */
export const MIN_NOITES = 5;

/** Janela de onde as noites saem, em dias. */
export const JANELA_DIAS = 14;

/** Antecedência do lembrete de deitar e atraso do de acordar, em minutos. */
export const FOLGA_MIN = 30;

/** Distância entre dois horários no relógio de 24h, em minutos. */
function distanciaCircular(a, b) {
  const d = Math.abs(a - b) % MIN_POR_DIA;
  return Math.min(d, MIN_POR_DIA - d);
}

/**
 * Mediana circular: o horário observado que minimiza a soma das distâncias
 * circulares até os outros.
 *
 * Devolve um horário que de fato aconteceu, e não uma média sintética. Com
 * número par de noites, fica com um dos dois do meio, e o empate cai no menor
 * minuto pra que a resposta não dependa da ordem das linhas na tabela.
 *
 * @param {number[]} minutos minutos desde a meia-noite
 * @returns {number|null}
 */
export function medianaCircular(minutos) {
  let melhor = null;
  let menorSoma = Infinity;
  for (const c of [...minutos].sort((a, b) => a - b)) {
    const soma = minutos.reduce((acc, m) => acc + distanciaCircular(c, m), 0);
    if (soma < menorSoma) {
      menorSoma = soma;
      melhor = c;
    }
  }
  return melhor;
}

/**
 * A noite a que um INSTANTE pertence, pela fronteira das 18h do #355.
 *
 * ⚠️ Não usar no retorno do `nightInstant`: ele já vem deslocado pela
 * fronteira, e reaplicá-la empurraria a noite de quem deita depois da
 * meia-noite um dia pra trás.
 */
function noiteDoInstante(ms) {
  const d = new Date(ms);
  if (d.getHours() < 18) d.setDate(d.getDate() - 1);
  return diaLocal(d.getTime());
}

/** A noite a que um REGISTRO pertence: pelo deitar, ou pelo `createdAt`. */
function noiteDoRegistro(r) {
  const instante = nightInstant(r);
  if (instante != null) return diaLocal(instante);
  const ts = Number(r?.createdAt);
  return Number.isFinite(ts) && ts > 0 ? noiteDoInstante(ts) : null;
}

/** Registros de sono da janela, cada um com a noite a que pertence. */
function noitesDaJanela(records, now, dias) {
  const limite = now - dias * MS_DIA;
  return (records ?? [])
    .filter((r) => {
      if (r?.type !== "sleep") return false;
      const ts = Number(r.createdAt);
      return Number.isFinite(ts) && ts >= limite && ts <= now;
    })
    .map((r) => ({ r, noite: noiteDoRegistro(r) }))
    .filter((x) => x.noite != null);
}

/**
 * Um horário por noite: o do registro mais recente da noite que o tenha.
 *
 * Sem isso, quem corrige um registro criando outro contaria a mesma noite duas
 * vezes, e dois registros da mesma noite valeriam como duas noites pro mínimo.
 */
function umPorNoite(itens, ler) {
  const porNoite = new Map();
  for (const { r, noite } of itens) {
    const min = parseHHMM(ler(r));
    if (min == null) continue;
    const ts = Number(r.createdAt);
    const atual = porNoite.get(noite);
    if (!atual || ts > atual.ts) porNoite.set(noite, { min, ts });
  }
  return [...porNoite.values()].map((v) => v.min);
}

/**
 * Horários típicos de deitar e de acordar, ou `null` pra cada um que ainda não
 * tem noites suficientes.
 *
 * Os dois são independentes: `wake` é opcional no registro (§4.2), então é
 * comum haver deitar suficiente e acordar não. Nesse caso só o lembrete de
 * deitar existe.
 *
 * Aceita linha crua do `useTable` e registro hidratado.
 *
 * @param {Array<object>} records
 * @param {number} [now]
 * @returns {{bed: number|null, wake: number|null, nBed: number, nWake: number}}
 *   minutos desde a meia-noite
 */
export function typicalSleepTimes(records, now = Date.now()) {
  const itens = noitesDaJanela(records, now, JANELA_DIAS);
  const deitares = umPorNoite(itens, bedOf);
  const acordares = umPorNoite(itens, wakeOf);
  return {
    bed: deitares.length >= MIN_NOITES ? medianaCircular(deitares) : null,
    wake: acordares.length >= MIN_NOITES ? medianaCircular(acordares) : null,
    nBed: deitares.length,
    nWake: acordares.length,
  };
}

/**
 * Noites que já não precisam de cada lembrete.
 *
 * O de deitar se cala com `bed`. O de acordar se cala com `wake` OU com
 * duração, porque quem registrou só a duração de manhã já registrou a noite.
 */
function noitesResolvidas(records, now) {
  // Janela folgada: o lembrete mais distante fica a poucos dias de `now`, e
  // olhar só pra trás bastaria, mas a noite de hoje começa no passado recente.
  const itens = noitesDaJanela(records, now, 3);
  const comBed = new Set();
  const comAcordar = new Set();
  for (const { r, noite } of itens) {
    if (parseHHMM(bedOf(r)) != null) comBed.add(noite);
    if (parseHHMM(wakeOf(r)) != null || Number(r.quantity) > 0) {
      comAcordar.add(noite);
    }
  }
  return { comBed, comAcordar };
}

/**
 * As próximas `dias` ocorrências de um horário, puladas as noites resolvidas.
 *
 * `setDate` em vez de somar 24h, pra hora de parede sobreviver à troca de
 * horário de verão.
 */
function proximas(minuto, now, dias, resolvidas) {
  const agora = new Date(now);
  const datas = [];
  // Folga de tentativas: cada noite resolvida pula um dia, e no máximo uma
  // noite (a de hoje) pode estar resolvida antes de acontecer.
  for (let k = 0; datas.length < dias && k < dias + 2; k++) {
    const d = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() + k,
      Math.floor(minuto / 60),
      minuto % 60,
    );
    const at = d.getTime();
    if (at <= now) continue;
    if (resolvidas.has(noiteDoInstante(at))) continue;
    datas.push(at);
  }
  return datas;
}

/**
 * Agenda dos lembretes de sono.
 *
 * @param {{
 *   records: Array<object>,
 *   enabled: boolean,
 *   dias: number,
 *   now?: number,
 * }} args `dias` vem do teto de agendamento do lembrete do foco (#365).
 * @returns {Array<{kind: "bed"|"wake", at: number}>} em ordem de horário
 */
export function sleepReminderSchedule({
  records,
  enabled,
  dias,
  now = Date.now(),
}) {
  if (!enabled) return [];
  const { bed, wake } = typicalSleepTimes(records, now);
  const { comBed, comAcordar } = noitesResolvidas(records, now);

  const agenda = [];
  if (bed != null) {
    const alvo = (bed - FOLGA_MIN + MIN_POR_DIA) % MIN_POR_DIA;
    for (const at of proximas(alvo, now, dias, comBed)) {
      agenda.push({ kind: "bed", at });
    }
  }
  if (wake != null) {
    const alvo = (wake + FOLGA_MIN) % MIN_POR_DIA;
    for (const at of proximas(alvo, now, dias, comAcordar)) {
      agenda.push({ kind: "wake", at });
    }
  }
  return agenda.sort((a, b) => a.at - b.at);
}
