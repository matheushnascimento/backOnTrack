// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Metas por métrica (#285, fatia 0 do modelo de níveis).
//
// Antes disto as metas eram texto fixo em `app/ajustes.jsx`: display-only,
// sem existir como dado. O modelo de níveis não fecha sem elas: o portão de
// nível compara comportamento contra um alvo, e "8h pra todo mundo" é mentira
// (tem gente que precisa de 7). Ver `docs/11-modelo-de-niveis.md` §10.
//
// A fatia 0 só transformou em dado, com os mesmos valores de antes. A edição
// pelo usuário chegou no #423 (`EDITABLE_GOALS`, no fim deste arquivo).

/** Unidades vêm do `CATEGORY_MAP`; aqui só o alvo diário. */
export const DEFAULT_GOALS = {
  water: 2000, // ml, "2,0 L" no Ajustes de hoje
  sleep: 480, // min, 8h
  exercise: 30, // min
  feeding: 3, // refeições
  study: 30, // min
};

/**
 * Como o dia é avaliado contra o alvo. Decide qual regra de quebra se aplica
 * (`docs/11-modelo-de-niveis.md` §6) e, mais pra frente, como o portão lê o
 * hábito.
 *
 * - `sum`: soma do dia contra o alvo (água, exercício, estudo, refeições).
 * - `presence`: houve registro? (a quantidade não decide nada)
 *
 * **Sono é `presence` de propósito.** A §4 do modelo é explícita: o portão é
 * comportamento, nunca desfecho. Ninguém decide dormir 8h. Decide deitar às
 * 23h30. Somar duração e comparar com 480 min gatearia nível por uma coisa
 * fora do controle da pessoa. A duração segue registrada e exibida; quem
 * avalia o hábito é a regularidade do horário (ver `regularity` em
 * `habitSignals.js`).
 */
/**
 * Faixa de suficiência, pra métrica cujo alvo honesto não é um ponto (#340).
 *
 * O sono é o caso: a literatura trata 7 a 8 horas como suficiente pra adulto,
 * e este arquivo já dizia isso num comentário enquanto a tela exibia "8h"
 * cravado. Quem dorme 7h15 lia o próprio registro como falha.
 *
 * ⚠️ **Isto é exibição, não portão.** O sono é `presence`, e o `dailyVerdicts`
 * faz `hit = n > 0` nesse modo, então nem 480 nem a faixa decidem nível.
 *
 * Vive aqui, e não no `DEFAULT_GOALS`, porque o `ensureGoals` só semeia
 * quando a célula está ausente: quem já usa o app tem 480 gravado e
 * continuaria vendo 8h se só o default mudasse.
 *
 * @type {Record<string, [number, number]>}
 */
export const GOAL_RANGE = {
  sleep: [420, 480],
};

export const GOAL_KIND = {
  water: "sum",
  sleep: "presence",
  exercise: "sum",
  feeding: "sum",
  study: "sum",
};

/**
 * Cadência esperada do hábito: define a unidade da regra de quebra (§6).
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

/**
 * Meta formatada pra exibição, na unidade que a pessoa lê.
 *
 * O alvo é guardado na unidade canônica da métrica (ml, minutos, refeições),
 * mas ninguém lê "2000 ml" nem "480 min". Lê "2,0 L" e "8h". Este é o
 * mesmo texto que estava chumbado em `app/ajustes.jsx` antes da #285.
 *
 * @param {string} metric
 * @param {number | null | undefined} target
 * @returns {string} `"—"` quando não há alvo conhecido.
 */
export function formatGoal(metric, target) {
  // Faixa vence o alvo guardado (#340). Ver GOAL_RANGE: o número do store
  // continua lá, e pra métrica `presence` ele nunca decidiu nada mesmo.
  //
  // Delega no formatador de PONTO de propósito. Chamar `formatGoal` aqui
  // recairia na faixa e recursaria sem fim.
  const faixa = GOAL_RANGE[metric];
  if (faixa) {
    const [min, max] = faixa;
    return `${formatPoint(metric, min)} a ${formatPoint(metric, max)}`;
  }
  return formatPoint(metric, target);
}

/** Um alvo único, já na unidade que a pessoa lê. */
function formatPoint(metric, target) {
  if (!Number.isFinite(target) || target <= 0) return "—";

  if (metric === "water") {
    const litros = target / 1000;
    return `${litros.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} L`;
  }

  if (metric === "sleep") {
    const h = Math.floor(target / 60);
    const m = target % 60;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
  }

  if (metric === "feeding") {
    return `${target} ${target === 1 ? "refeição" : "refeições"}`;
  }

  return `${target} min`;
}

// --- Edição pelo usuário (#423) ---

/**
 * Metas que a pessoa pode mudar, na ordem da jornada.
 *
 * O sono fica de fora: a referência dele é a faixa de 7h a 8h (`GOAL_RANGE`),
 * e ela é leitura da duração, nunca portão. Não há número do sono pra escolher.
 */
export const EDITABLE_GOALS = JOURNEY_ORDER.filter((m) => !GOAL_RANGE[m]);

/**
 * Limites de cada meta editável, na unidade canônica (ml, refeições, min).
 *
 * Servem pra recusar o que só pode ser engano de digitação, e não pra dizer
 * quanto alguém deve beber ou estudar. Por isso são largos.
 *
 * A água anda de 100 em 100 ml porque é a precisão que a tela mostra: o
 * `formatGoal` escreve uma casa decimal em litros, e 1,25 L apareceria como
 * 1,3 L.
 */
export const GOAL_LIMITS = {
  water: { min: 500, max: 5000, step: 100 },
  feeding: { min: 1, max: 8, step: 1 },
  exercise: { min: 5, max: 240, step: 1 },
  study: { min: 5, max: 480, step: 1 },
};

/** Unidade que aparece ao lado do campo de edição. */
export const GOAL_INPUT_UNIT = {
  water: "L",
  feeding: "refeições",
  exercise: "min",
  study: "min",
};

/**
 * Converte o que a pessoa digitou pra unidade canônica.
 *
 * Água é digitada em litros, com vírgula ou ponto ("1,5" vira 1500). As
 * demais são inteiros. Devolve `null` pra texto que não é número, número fora
 * dos limites ou água com mais precisão do que a tela mostra.
 *
 * @param {string} metric
 * @param {string} texto
 * @returns {number | null}
 */
export function parseGoalInput(metric, texto) {
  const limites = GOAL_LIMITS[metric];
  if (!limites) return null;
  const limpo = String(texto ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;

  const valor =
    metric === "water" ? Math.round(Number(limpo) * 1000) : Number(limpo);
  if (!Number.isInteger(valor)) return null;
  if (valor % limites.step !== 0) return null;
  if (valor < limites.min || valor > limites.max) return null;
  return valor;
}

/**
 * O valor guardado, escrito do jeito que o campo de edição espera.
 *
 * @param {string} metric
 * @param {number | null | undefined} target
 * @returns {string}
 */
export function goalInputValue(metric, target) {
  if (!Number.isFinite(target)) return "";
  if (metric === "water")
    return (Number(target) / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });
  return String(target);
}

/**
 * Frase com os limites, pra dica do campo.
 *
 * @param {string} metric
 * @returns {string}
 */
export function goalLimitsHint(metric) {
  const l = GOAL_LIMITS[metric];
  if (!l) return "";
  return `Entre ${formatPoint(metric, l.min)} e ${formatPoint(metric, l.max)}.`;
}
