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
 * a pessoa quis dizer, e adivinhar erra em silêncio. Mesmo espírito do aviso de
 * noite implausível do #353, que este módulo absorveu: ele bloqueava com
 * mensagem em vez de corrigir sozinho, e agora as três métricas têm isso.
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

import { hhmmToMinutes } from "./duration";

const MIN_POR_DIA = 1440;

/**
 * Teto de sanidade por métrica, em minutos.
 *
 * O do sono vem do #353, e é o único com raciocínio por trás: sono muito
 * longo, por doença ou recuperação, chega a 12 ou 14 horas, então 16 fica
 * acima do legítimo e abaixo do absurdo. E o absurdo tem uma forma só, que é
 * horário invertido: deitar 23:00 e acordar 22:00 dá 23 horas, e o app aceitava
 * isso em silêncio.
 *
 * Os outros dois são palpite. Ficam aqui pra ter o mesmo tipo de proteção, e
 * não porque alguém mediu 6h de exercício ou 12h de estudo como limite. Dado de
 * uso muda estes números.
 */
export const MAX_SPAN_MIN = {
  exercise: 6 * 60,
  study: 12 * 60,
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

/**
 * "HH:MM" de agora, pro atalho "comecei agora" das três telas.
 *
 * Vive aqui, e não em cada tela, porque o sono tinha a própria cópia e o
 * exercício ia ganhar a segunda. Formato de relógio, com dois dígitos na hora,
 * pro `reconcileTimes` aceitar sem reformatar.
 */
export function horaAgora(now = new Date()) {
  return fmtClock(now.getHours() * 60 + now.getMinutes());
}

/**
 * A parte de tempo de um registro, nos nomes de campo da métrica.
 *
 * As três telas montavam isso na mão, com os mesmos spreads condicionais
 * repetidos quatro vezes cada (criar e editar). Era o lugar exato do bug que
 * já aconteceu duas vezes: o `update` RECONSTRÓI o `details`, então um campo
 * esquecido num dos callsites SOME em silêncio, com a suíte verde (#328, #332).
 *
 * Os nomes mudam por métrica porque os registros existentes mudam, e não por
 * escolha: o sono grava `bed`/`wake` desde o #328, e o exercício grava o início
 * como `trainingTime` desde antes. Renomear exigiria migração do `details`.
 *
 * `startAlways` é pros dois que sempre escreveram o campo de início, mesmo
 * vazio. Omitir passaria a apagá-lo desses registros, e não é o que a tela
 * pediu.
 *
 * @param {{start: string, end: string, duration: string}} span saída do `reconcileTimes`
 * @param {{start: string, end: string, startAlways?: boolean}} nomes
 */
export function spanRecord(span, { start, end, startAlways = false }) {
  const campos = { quantity: hhmmToMinutes(span.duration) };
  if (span.start || startAlways) campos[start] = span.start;
  if (span.end) campos[end] = span.end;
  return campos;
}

/** Nomes de campo por métrica. Ver `spanRecord`. */
export const SPAN_NAMES = {
  exercise: { start: "trainingTime", end: "end", startAlways: true },
  study: { start: "start", end: "end" },
  sleep: { start: "bed", end: "wake", startAlways: true },
};

/**
 * A faixa de horário de um registro, pro histórico: "18:30-19:30", ou só
 * "18:30" quando não há fim.
 *
 * O card mostrava isso só no exercício, e só o início, porque era a única tela
 * que tinha horário. Agora as três têm, e deixar os campos novos invisíveis
 * seria gravar dado que ninguém lê.
 *
 * ⚠️ Espera registro HIDRATADO, com os campos do `details` no topo, que é o que
 * `get`/`getById` devolvem. Linha crua do `useTable` tem os campos presos no
 * `details`, e ali o retorno seria vazio sem erro nenhum (#356).
 *
 * @param {Record<string, any>|null|undefined} registro
 * @param {string} metric chave da métrica (nome da tabela)
 * @returns {string} vazio quando não há início
 */
export function spanLabel(registro, metric) {
  const nomes = SPAN_NAMES[metric];
  if (!nomes) return "";
  const inicio = registro?.[nomes.start];
  if (parseClock(inicio) == null) return "";
  const fim = registro?.[nomes.end];
  return parseClock(fim) == null ? inicio : `${inicio}-${fim}`;
}
