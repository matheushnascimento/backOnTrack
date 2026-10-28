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
 * ## A regra da higiene do sono (#396, fatia 4)
 *
 * Com a escada configurada, entra um terceiro aviso: meia hora antes do prazo
 * da regra ativa ("Em meia hora, hora de largar as telas"). O horário vem do
 * alvo que a pessoa escolheu, e não do aprendido, então ele existe desde a
 * primeira noite.
 * aviso: ela é marcada à noite, junto do deitar.
 *
 * Isolado como função pura pelo motivo de sempre: o `expo-notifications` não
 * roda no jest, e a regra inteira dá pra testar sem ele.
 */

import { diaLocal } from "./habitSignals";
import {
  estadoDaEscada,
  noiteDe,
  noitesCumpridas,
  prazoDaRegra,
} from "./sleepHygiene";
import { bedOf, nightInstant, parseHHMM, wakeOf } from "./sleepTimes";
import { fmtClock } from "./timeSpan";

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
 *
 * @param {(at: number) => boolean} resolvida a noite deste instante já não
 *   precisa do aviso?
 */
function proximas(minuto, now, dias, resolvida) {
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
    if (resolvida(at)) continue;
    datas.push(at);
  }
  return datas;
}

/**
 * O aviso da regra ativa da escada, ou `null` se não há o que avisar.
 *
 * Sem escada configurada ou sem regra ativa (a anterior virou rotina e a
 * próxima não foi escolhida).
 *
 * @param {{alvo: string, degraus: Array<object>}|null} hygiene o formato do
 *   `getHygiene`, o mesmo que a jornada recebe
 * @returns {{regra: string, alvo: string, minuto: number}|null} `minuto` é o
 *   do aviso, já com a folga
 */
export function ruleReminder(records, hygiene, now = Date.now()) {
  if (!hygiene) return null;
  const escada = estadoDaEscada({
    alvo: hygiene.alvo,
    degraus: hygiene.degraus,
    records,
    now,
  });
  if (!escada.configurada || !escada.ativa) return null;
  const prazo = parseHHMM(prazoDaRegra(escada.ativa, escada.alvo));
  if (prazo == null) return null;
  return {
    regra: escada.ativa,
    alvo: escada.alvo,
    minuto: (prazo - FOLGA_MIN + MIN_POR_DIA) % MIN_POR_DIA,
  };
}

/**
 * Agenda dos lembretes de sono.
 *
 * @param {{
 *   records: Array<object>,
 *   enabled: boolean,
 *   dias: number,
 *   now?: number,
 *   hygiene?: {alvo: string, degraus: Array<object>}|null,
 * }} args `dias` vem do teto de agendamento do lembrete do foco (#365).
 * @returns {Array<{kind: "bed"|"wake"|"rule", at: number, regra?: string}>}
 *   em ordem de horário
 */
export function sleepReminderSchedule({
  records,
  enabled,
  dias,
  now = Date.now(),
  hygiene = null,
}) {
  if (!enabled) return [];
  const { bed, wake } = typicalSleepTimes(records, now);
  const { comBed, comAcordar } = noitesResolvidas(records, now);

  const agenda = [];
  if (bed != null) {
    const alvo = (bed - FOLGA_MIN + MIN_POR_DIA) % MIN_POR_DIA;
    const resolvida = (at) => comBed.has(noiteDoInstante(at));
    for (const at of proximas(alvo, now, dias, resolvida)) {
      agenda.push({ kind: "bed", at });
    }
  }
  if (wake != null) {
    const alvo = (wake + FOLGA_MIN) % MIN_POR_DIA;
    const resolvida = (at) => comAcordar.has(noiteDoInstante(at));
    for (const at of proximas(alvo, now, dias, resolvida)) {
      agenda.push({ kind: "wake", at });
    }
  }
  const regra = ruleReminder(records, hygiene, now);
  if (regra) {
    // A noite aqui é a da escada (fronteira 6h depois do alvo), a mesma em
    // que o "cumpri" cai. Quem já marcou a regra da noite não é avisado.
    const cumpridas = noitesCumpridas(records, regra.regra, regra.alvo);
    const resolvida = (at) => cumpridas.has(noiteDe(at, regra.alvo));
    for (const at of proximas(regra.minuto, now, dias, resolvida)) {
      agenda.push({ kind: "rule", at, regra: regra.regra });
    }
  }
  return agenda.sort((a, b) => a.at - b.at);
}

/** O que cada regra pede, no aviso de meia hora antes do prazo. */
const AVISO_DA_REGRA = {
  10: "Em meia hora, a cafeína de hoje acaba.",
  3: "Em meia hora, nada de comida pesada nem álcool até deitar.",
  2: "Em meia hora, nada de esforço intenso até deitar.",
  1: "Em meia hora, hora de largar as telas.",
};

/**
 * Texto de cada lembrete, sem cobrança.
 *
 * O de deitar avisa o que vem, em vez de mandar: o app aprendeu um horário, e
 * dizer "hora de deitar" transformaria um padrão observado numa ordem. O de
 * acordar segue o mesmo convite do lembrete do foco (#364).
 *
 * O da regra segue o mesmo tom: avisa o prazo que a pessoa escolheu, sem
 * perguntar se ela vai cumprir.
 *
 * @param {"bed"|"wake"|"rule"} kind
 * @param {string} [regra] só pro `rule`
 * @returns {{title: string, body: string}}
 */
export function sleepReminderText(kind, regra) {
  return {
    title: "Back on Track",
    body:
      kind === "rule"
        ? (AVISO_DA_REGRA[regra] ?? "Em meia hora, o prazo da regra de hoje.")
        : kind === "bed"
          ? "Em meia hora costuma ser sua hora de deitar."
          : "Um minuto pra registrar a noite?",
  };
}

/**
 * O lembrete do sono assume o lugar do lembrete fixo do foco?
 *
 * Só quando o foco É o sono, a pessoa ligou o do sono e ele tem noites
 * suficientes pra existir. Sem isso seriam dois lembretes sobre a mesma noite.
 *
 * Abaixo do mínimo de noites, o fixo continua: desligá-lo antes do adaptativo
 * ter dado deixaria quem está começando sem lembrete nenhum.
 *
 * @param {{focus: string|null, enabled: boolean, records: Array<object>, now?: number}} args
 */
export function sleepTakesOverFocus({
  focus,
  enabled,
  records,
  now = Date.now(),
}) {
  if (focus !== "sleep" || !enabled) return false;
  return typicalSleepTimes(records, now).bed != null;
}

/**
 * O que Ajustes mostra embaixo do interruptor.
 *
 * Ligar sem noites suficientes não agenda nada, e sem este texto a tela ficaria
 * muda sobre isso. Foi o defeito do 21:00 no #365: a interface prometia, e nada
 * acontecia.
 *
 * @param {Array<object>} records
 * @param {number} [now]
 * @param {{alvo: string, degraus: Array<object>}|null} [hygiene]
 * @returns {{faltam: number, deitar: string|null, acordar: string|null, regra: string|null}}
 *   `faltam` são as noites com horário de deitar que ainda faltam; os horários
 *   são os dos AVISOS, já com a folga, e não os típicos.
 */
export function sleepReminderStatus(records, now = Date.now(), hygiene = null) {
  const { bed, wake, nBed } = typicalSleepTimes(records, now);
  const regra = ruleReminder(records, hygiene, now);
  return {
    faltam: Math.max(0, MIN_NOITES - nBed),
    deitar: bed == null ? null : fmtClock(bed - FOLGA_MIN + MIN_POR_DIA),
    acordar: wake == null ? null : fmtClock(wake + FOLGA_MIN),
    regra: regra == null ? null : fmtClock(regra.minuto),
  };
}
