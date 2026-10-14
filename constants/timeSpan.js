// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Coerência entre início, fim e duração (#366).
 *
 * As três métricas de tempo faziam isso de três jeitos: o sono derivava a
 * duração dos horários, o exercício tinha início e duração **independentes**
 * (dava pra dizer "comecei 10:00, durou 1h" sem nada ligar os dois, e sem fim
 * nenhum), e o estudo só tinha duração.
 *
 * ## A regra
 *
 * Dois valores determinam o terceiro. Com três preenchidos que não fecham a
 * conta, o resultado carrega um `issue` e **o caller não grava**.
 *
 * Travar em vez de escolher é decisão de produto: o app não sabe qual dos três
 * a pessoa quis dizer, e adivinhar erra em silêncio. Mesmo espírito do
 * `sleepTimeIssue`, que já bloqueia noite absurda com mensagem em vez de
 * corrigir sozinho.
 *
 * ## Atravessar a meia-noite
 *
 * O fim pode ser menor que o início, e aí a sessão virou o dia. É o que o sono
 * já fazia com `(fim - início + 1440) % 1440`.
 *
 * O preço é que erro de digitação vira sessão longa em silêncio: `09:00` no
 * lugar de `19:00` daria 14 horas sem reclamar. Por isso o `maxMin`, que é
 * teto de sanidade por métrica, e não regra de negócio. Os números são
 * arbitrários até existir dado de uso que os sustente.
 */

const MIN_POR_DIA = 1440;

/** Teto de sanidade por métrica, em minutos. Arbitrário até haver medição. */
export const MAX_SPAN_MIN = {
  exercise: 6 * 60,
  study: 12 * 60,
  // O sono tem o próprio teto desde o #354, em `sleepTimes.js`.
  sleep: 16 * 60,
};

/** Horário de relógio "23:40" em minutos do dia, ou `null`. Estrito. */
function parseClock(hhmm) {
  if (typeof hhmm !== "string" || hhmm.trim() === "") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return undefined; // inválido, diferente de vazio
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

/**
 * Duração "1:30" em minutos, ou `null`.
 *
 * Parser separado do de relógio de propósito: duração não é horário. "25:00"
 * é hora inválida e duração plausível, e tratar os dois com a mesma régua
 * rejeitaria uma ou aceitaria a outra errado.
 */
function parseDur(hhmm) {
  if (typeof hhmm !== "string" || hhmm.trim() === "") return null;
  const m = /^(\d{1,3}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return undefined;
  const min = Number(m[2]);
  if (min > 59) return undefined;
  return Number(m[1]) * 60 + min;
}

/** minutos → "1:30". */
function fmtDur(total) {
  const h = Math.floor(total / 60);
  return `${h}:${String(total % 60).padStart(2, "0")}`;
}

/** minutos do dia → "23:40", com 2 dígitos na hora, que é formato de relógio. */
function fmtClock(total) {
  const t = ((total % MIN_POR_DIA) + MIN_POR_DIA) % MIN_POR_DIA;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const problema = (code, message) => ({ code, message });

/**
 * Completa o que falta e aponta contradição.
 *
 * @param {{start?: string, end?: string, duration?: string, maxMin?: number}} campos
 *   Strings "HH:MM"; vazio significa não preenchido.
 * @returns {{
 *   start: string, end: string, duration: string,
 *   derived: "start"|"end"|"duration"|null,
 *   issue: {code: string, message: string}|null,
 * }}
 */
export function reconcileTimes({ start, end, duration, maxMin } = {}) {
  const s = parseClock(start);
  const e = parseClock(end);
  const d = parseDur(duration);

  const comoVeio = {
    start: start ?? "",
    end: end ?? "",
    duration: duration ?? "",
    derived: null,
  };

  // Campo ilegível: não dá pra derivar nada nem afirmar contradição.
  if (s === undefined || e === undefined || d === undefined) {
    return {
      ...comoVeio,
      issue: problema("formato", "Confere os horários: algo ficou ilegível."),
    };
  }

  // Duração de um dia ou mais não tem como ser descrita por dois horários de
  // relógio, e sem esta guarda o `% 1440` faria 25h bater com 1h.
  if (d != null && d >= MIN_POR_DIA) {
    return {
      ...comoVeio,
      issue: problema(
        "duracao-longa",
        "Mais de 24h não dá pra registrar como uma sessão só.",
      ),
    };
  }

  const preenchidos = [s, e, d].filter((v) => v != null).length;

  // Zero ou um campo não é erro: é formulário pela metade.
  if (preenchidos <= 1) return { ...comoVeio, issue: null };

  const vaoDaQuantidade = (dur) =>
    maxMin != null && dur > maxMin
      ? problema(
          "longa-demais",
          `Isso daria ${fmtDur(dur)}. Confere se os horários não estão trocados.`,
        )
      : null;

  if (preenchidos === 3) {
    const esperada = (e - s + MIN_POR_DIA) % MIN_POR_DIA;
    if (esperada !== d) {
      return {
        ...comoVeio,
        issue: problema(
          "conflito",
          `Os três não fecham: de ${fmtClock(s)} a ${fmtClock(e)} dá ${fmtDur(esperada)}, e não ${fmtDur(d)}. Ajusta um deles.`,
        ),
      };
    }
    return { ...comoVeio, issue: vaoDaQuantidade(d) };
  }

  // Exatamente dois: deriva o terceiro.
  if (s != null && e != null) {
    const dur = (e - s + MIN_POR_DIA) % MIN_POR_DIA;
    return {
      start: fmtClock(s),
      end: fmtClock(e),
      duration: fmtDur(dur),
      derived: "duration",
      issue: vaoDaQuantidade(dur),
    };
  }
  if (s != null && d != null) {
    return {
      start: fmtClock(s),
      end: fmtClock(s + d),
      duration: fmtDur(d),
      derived: "end",
      issue: vaoDaQuantidade(d),
    };
  }
  return {
    start: fmtClock(e - d),
    end: fmtClock(e),
    duration: fmtDur(d),
    derived: "start",
    issue: vaoDaQuantidade(d),
  };
}
