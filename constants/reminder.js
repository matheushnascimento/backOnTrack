// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Quando deve sair o próximo lembrete do hábito em foco (#364).
 *
 * Isolado como função pura pelo mesmo motivo do `sync-retry.js` e do
 * `sync-session.js`: dá pra testar a regra inteira sem tocar em
 * `expo-notifications`, que é módulo nativo e não roda no jest.
 *
 * ## Por que a próxima ocorrência, e não um disparo diário
 *
 * O `expo-notifications` não roda código na hora do disparo. Não há como
 * perguntar "já registrou hoje?" no instante em que a notificação sairia, a
 * menos de background task, que é pesada e pouco confiável nas duas
 * plataformas.
 *
 * Então "calado se já registrou" se implementa **cancelando**: agenda-se uma
 * ocorrência única, e o caller recalcula quando o estado muda. Um gatilho
 * diário repetente dispararia mesmo depois do registro, que é exatamente a
 * cobrança que o modelo recusa.
 *
 * ## Por que só o hábito em foco
 *
 * A jornada forma um hábito por vez (§3 do modelo). Lembrar das cinco
 * métricas contradiz isso, e lembrar de quantidade contradiz o §4.1, que em
 * 15/09 fixou a **ocasião** como unidade do veredito.
 *
 * Sem foco não há lembrete: quem já graduou tudo, ou ainda não entrou na
 * jornada, não tem o que ser lembrado.
 */

// Reusa o parser de `sleepTimes.js`, mesmo caminho do #356: ter uma terceira
// cópia do mesmo regex é como as faixas de porta do #342 divergiram.
import { parseHHMM } from "./sleepTimes";

/**
 * Horário do lembrete quando a pessoa ativa sem escolher um.
 *
 * Ajustes MOSTRAVA 21:00 no placeholder, mas o valor gravado ficava vazio e o
 * `nextReminderAt` devolvia `null`: a tela dizia que ia lembrar e nada era
 * agendado. Agora o placeholder e o agendamento leem daqui.
 */
export const DEFAULT_REMINDER_TIME = "21:00";

/**
 * Instante do próximo lembrete, ou `null` quando não deve haver nenhum.
 *
 * @param {{
 *   enabled?: boolean,
 *   hhmm?: string,
 *   focus?: string|null,
 *   registeredToday?: boolean,
 *   now?: number,
 * }} args
 * @returns {number|null} epoch ms, ou `null` pra "não agende nada"
 */
export function nextReminderAt({
  enabled,
  hhmm,
  focus,
  registeredToday = false,
  now = Date.now(),
} = {}) {
  if (!enabled) return null;
  if (!focus) return null;

  // Vazio vale o padrão que Ajustes exibe, e não "sem lembrete". Inválido
  // continua sendo `null`: não dá pra adivinhar o que "25:99" queria dizer.
  const minuto = parseHHMM(hhmm || DEFAULT_REMINDER_TIME);
  if (minuto == null) return null;

  const agora = new Date(now);
  const alvo = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    Math.floor(minuto / 60),
    minuto % 60,
    0,
    0,
  );

  // Já registrou hoje, ou o horário de hoje já passou: o próximo é amanhã.
  // Agendar no passado faria a notificação sair na hora, que é o oposto do
  // que a pessoa pediu.
  const minutoAgora = agora.getHours() * 60 + agora.getMinutes();
  if (registeredToday || minuto <= minutoAgora) {
    alvo.setDate(alvo.getDate() + 1);
  }

  return alvo.getTime();
}

/**
 * Quantos dias à frente ficam agendados de uma vez.
 *
 * O app só recalcula com ele aberto. Com uma ocorrência só, um dia sem abrir o
 * app desligava o lembrete até a próxima abertura, justamente pra quem mais
 * precisaria dele. Com várias sem teto, quem sumiu receberia cobrança diária
 * indefinida, e o modelo deixa a volta com a tela de retomada, que convida sem
 * cobrar. Três é palpite, como os tetos de tempo do #366.
 */
export const DIAS_AGENDADOS = 3;

/**
 * As próximas ocorrências, uma por dia, a partir de `nextReminderAt`.
 *
 * `setDate` em vez de somar 24h: no dia de troca de horário de verão, somar
 * milissegundos deslocaria o lembrete em uma hora.
 *
 * @param {Parameters<typeof nextReminderAt>[0]} args
 * @param {number} [dias]
 * @returns {number[]} epoch ms, vazio quando não deve haver lembrete
 */
export function reminderSchedule(args, dias = DIAS_AGENDADOS) {
  const primeiro = nextReminderAt(args);
  if (primeiro == null) return [];
  const datas = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(primeiro);
    d.setDate(d.getDate() + i);
    datas.push(d.getTime());
  }
  return datas;
}

/**
 * Texto da notificação, sem cobrança.
 *
 * O tom é o mesmo da tela de retomada, que "não cobra quem sumiu, convida".
 * Nada de "você esqueceu", "não perca", contagem de dias ou exclamação: o
 * §1.5 do modelo reserva reconhecimento pros momentos de nível, e lembrete
 * não é momento.
 *
 * @param {string} focus Métrica em foco.
 * @param {Record<string, {displayName?: string}>} mapa `CATEGORY_MAP`.
 * @returns {{title: string, body: string}}
 */
export function reminderText(focus, mapa = {}) {
  const nome = mapa?.[focus]?.displayName ?? focus;
  return {
    title: "Back on Track",
    body: `Um minuto pra registrar ${nome}?`,
  };
}
