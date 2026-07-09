// Conversão entre "HH:MM" e minutos, para as métricas de tempo (sono,
// exercício, estudo). O modelo unificado guarda `quantity` como número
// (minutos, unit "min"); a UI continua editando/exibindo em "HH:MM".

/**
 * "7:30" -> 450. Aceita horas/minutos vazios ("" -> 0).
 * @param {string | number} hhmm
 * @returns {number}
 */
export function hhmmToMinutes(hhmm) {
  if (typeof hhmm !== "string") return Number(hhmm) || 0;
  const [h, m] = hhmm.split(":");
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

/**
 * 450 -> "7:30" (minutos sempre com 2 dígitos).
 * @param {string | number} minutes
 * @returns {string}
 */
export function minutesToHHMM(minutes) {
  const total = Number(minutes) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
