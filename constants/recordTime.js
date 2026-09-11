// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Corrigir a hora de um registro (#336).
//
// O `createdAt` é a hora do EVENTO pra todo o app: exibição no histórico,
// inferência de qual refeição é, contagem de dias, e o sinal de regularidade.
// Quem lança quatro refeições às 22h carimba as quatro no mesmo minuto.
//
// ⚠️ **Isso não é só histórico sujo.** A `regularity` calcula dispersão
// circular sobre `createdAt`, e o portão da jornada exige dispersão abaixo de
// 120 minutos. Quatro registros no mesmo horário dão dispersão perto de zero,
// então o lote **finge regularidade perfeita** e empurra o hábito a passar no
// portão por um motivo falso.
//
// ## Por que só hora e minuto
//
// O app tem dois campos de tempo, e eles agrupam por dia de formas
// diferentes: `getByDate` usa `date`, e `dailyVerdicts` usa `createdAt`.
// Deixar a correção atravessar a meia-noite faria o registro aparecer num dia
// no histórico e contar em outro nos sinais. Travar no mesmo dia elimina essa
// divergência, e cobre o caso real, que é "comi às 12:30, não às 22:00".

/**
 * Hora e minuto de um instante, como "HH:MM".
 *
 * @param {number} epochMs
 * @returns {string}
 */
export function timeOf(epochMs) {
  const d = new Date(Number(epochMs) || 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * O mesmo dia do instante original, na hora nova.
 *
 * `null` quando a hora não lê ou o instante é inválido, pra que quem chama
 * não grave lixo em cima de um timestamp que funcionava.
 *
 * @param {number} epochMs Instante original; dele sai o dia.
 * @param {string} hhmm "HH:MM"
 * @returns {number|null} epoch ms
 */
export function withTimeOfDay(epochMs, hhmm) {
  const base = Number(epochMs);
  if (!Number.isFinite(base) || base <= 0) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}
