// Registro de config por métrica.
//
// Após o #256 fatia 5 (faxina), cada métrica só declara o componente de
// histórico, o cardClass opcional e o `renderCustom`: o bespoke assume o
// fluxo inteiro (criação + edição). Adicionar uma métrica = adicionar um
// bespoke + entrada aqui.

import MyHistory, { MyExerciseHistory } from "@/components/MyHistory";
import WaterQuickAdd from "./WaterQuickAdd";
import SleepBespoke from "./SleepBespoke";
import ExerciseBespoke from "./ExerciseBespoke";
import FeedingBespoke from "./FeedingBespoke";
import StudyBespoke from "./StudyBespoke";

/**
 * @typedef {Object} MetricConfig
 * @property {any} History
 * @property {string} [cardClass]
 * @property {(props: { onAfterAdd: () => void, recordId?: string }) => any} [renderCustom]
 *   Bespoke que substitui o corpo do card no MetricScreen. Recebe `recordId`
 *   quando o HistoryCard abre em edição. Toda métrica ativa provê um.
 */

/** @type {Record<string, MetricConfig>} */
const REGISTRY = {
  water: {
    History: MyHistory,
    renderCustom: ({ onAfterAdd, recordId }) => (
      <WaterQuickAdd onAfterAdd={onAfterAdd} recordId={recordId} />
    ),
  },

  sleep: {
    History: MyHistory,
    renderCustom: ({ onAfterAdd, recordId }) => (
      <SleepBespoke onAfterAdd={onAfterAdd} recordId={recordId} />
    ),
  },

  feeding: {
    History: MyHistory,
    cardClass: "overflow-hidden",
    renderCustom: ({ onAfterAdd, recordId }) => (
      <FeedingBespoke onAfterAdd={onAfterAdd} recordId={recordId} />
    ),
  },

  exercise: {
    History: MyExerciseHistory,
    renderCustom: ({ onAfterAdd, recordId }) => (
      <ExerciseBespoke onAfterAdd={onAfterAdd} recordId={recordId} />
    ),
  },

  study: {
    History: MyHistory,
    renderCustom: ({ onAfterAdd, recordId }) => (
      <StudyBespoke onAfterAdd={onAfterAdd} recordId={recordId} />
    ),
  },
};

/** Config benigna pra métrica desconhecida, que nunca quebra a tela. */
const FALLBACK = /** @type {MetricConfig} */ ({
  History: MyHistory,
});

/**
 * @param {string} metric
 * @returns {MetricConfig}
 */
export function getMetricConfig(metric) {
  return REGISTRY[metric] ?? FALLBACK;
}
