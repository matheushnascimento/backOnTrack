// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Horários de dormir e acordar (#328).
//
// A tela de sono sempre pediu "deitou" e "acordou", mas gravava só a duração
// que eles produzem. Os horários morriam no submit, e por isso a edição só
// conseguia oferecer duração: o dado não existia pra ser editado.
//
// Agora `bed` e `wake` vão pro `details` do registro. A duração continua sendo
// gravada em `quantity`, porque é ela que alimenta metas, sinais e o total do
// dia, e nada disso deve ter que reparsear horário.
//
// ⚠️ **Todo registro anterior a esta mudança não tem os campos.** Isso não é
// caso de borda, é a maioria do histórico, e a edição precisa continuar
// funcionando neles. Quem decide é `timesFrom`, que devolve `null` e manda a
// tela cair no formulário de duração.

const DIA_MIN = 1440;

/**
 * "23:40" em minutos desde a meia-noite, ou `null`.
 *
 * Estrito de propósito. O `hhmmToMinutes` de `constants/duration.js` devolve 0
 * pra entrada inválida, o que serve pra somar duração e atrapalha aqui: 0 é um
 * horário legítimo (meia-noite), então "não consegui ler" precisa ser `null`.
 *
 * @param {string|null|undefined} hhmm
 * @returns {number|null}
 */
export function parseHHMM(hhmm) {
  if (typeof hhmm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Duração entre deitar e acordar, atravessando a meia-noite.
 *
 * Dormir 23:40 e acordar 07:00 são 7h20, e não um número negativo. O módulo
 * resolve isso. Duração zero devolve `null`, porque deitar e acordar no mesmo
 * minuto não é uma noite.
 *
 * @param {string} bed
 * @param {string} wake
 * @returns {number|null} minutos
 */
export function durationFromTimes(bed, wake) {
  const b = parseHHMM(bed);
  const w = parseHHMM(wake);
  if (b == null || w == null) return null;
  const dur = (w - b + DIA_MIN) % DIA_MIN;
  return dur > 0 ? dur : null;
}

/**
 * Os horários de um registro, quando ele os tem.
 *
 * `null` para registro antigo, que guardou só a duração. É esse `null` que faz
 * a edição oferecer o formulário certo em vez de mostrar dois campos vazios e
 * fingir que o dado existe.
 *
 * @param {{bed?: string, wake?: string}|null|undefined} registro
 * @returns {{bed: string, wake: string}|null}
 */
export function timesFrom(registro) {
  const bed = registro?.bed;
  const wake = registro?.wake;
  if (parseHHMM(bed) == null || parseHHMM(wake) == null) return null;
  return { bed, wake };
}
