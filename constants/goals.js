// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Metas por métrica (#285, fatia 0 do modelo de níveis).
//
// Antes disto as metas eram texto fixo em `app/ajustes.jsx` — display-only,
// sem existir como dado. O modelo de níveis não fecha sem elas: o portão de
// nível compara comportamento contra um alvo, e "8h pra todo mundo" é mentira
// (tem gente que precisa de 7). Ver `docs/11-modelo-de-niveis.md` §10.
//
// Esta fatia só transforma em dado, com os mesmos valores de hoje. Edição
// pelo usuário é fatia própria — o que importa agora é a forma, pra os sinais
// de automaticidade terem contra o que medir.

/** Unidades vêm do `CATEGORY_MAP`; aqui só o alvo diário. */
export const DEFAULT_GOALS = {
  water: 2000, // ml — "2,0 L" no Ajustes de hoje
  sleep: 480, // min — 8h
  exercise: 30, // min
  feeding: 3, // refeições
  study: 30, // min
};

/**
 * Como o dia é avaliado contra o alvo. Decide qual regra de quebra se aplica
 * (`docs/11-modelo-de-niveis.md` §6) e, mais pra frente, como o portão lê o
 * hábito.
 *
 * - `sum` — soma do dia contra o alvo (água, exercício, estudo, refeições).
 * - `presence` — houve registro? (a quantidade não decide nada)
 *
 * **Sono é `presence` de propósito.** A §4 do modelo é explícita: o portão é
 * comportamento, nunca desfecho. Ninguém decide dormir 8h — decide deitar às
 * 23h30. Somar duração e comparar com 480 min gatearia nível por uma coisa
 * fora do controle da pessoa. A duração segue registrada e exibida; quem
 * avalia o hábito é a regularidade do horário (ver `regularity` em
 * `habitSignals.js`).
 */
export const GOAL_KIND = {
  water: "sum",
  sleep: "presence",
  exercise: "sum",
  feeding: "sum",
  study: "sum",
};

/**
 * Cadência esperada do hábito — define a unidade da regra de quebra (§6).
 *
 * Exercício e estudo não são diários (3–5×/semana é o normal). Tratá-los como
 * diários rebaixaria alguém por descansar no fim de semana.
 */
export const GOAL_CADENCE = {
  water: "daily",
  sleep: "daily",
  exercise: "weekly",
  feeding: "daily",
  study: "weekly",
};

/** Métricas que participam da jornada, na ordem sugerida (§8). */
export const JOURNEY_ORDER = ["sleep", "water", "feeding", "exercise", "study"];

/**
 * Alvo de uma métrica, com fallback pro default.
 *
 * @param {Record<string, number> | null | undefined} goals Metas do store.
 * @param {string} metric
 * @returns {number | null} `null` se a métrica não tem alvo conhecido.
 */
export function goalFor(goals, metric) {
  const custom = goals?.[metric];
  if (Number.isFinite(custom) && custom > 0) return custom;
  return DEFAULT_GOALS[metric] ?? null;
}
