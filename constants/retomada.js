// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Copy da tela de retomada quando ela precisa falar da jornada (#320).
//
// A retomada foi desenhada no M5-B sem saber que níveis existiriam. Depois da
// jornada, as duas telas passaram a discordar: a retomada oferecia água
// primeiro e dizia "comece pelo mais fácil", enquanto a jornada colocava todo
// mundo no lvl 1 com foco em sono.
//
// Pior que isso, a retomada é um early return na Home, então ela escondia o
// aviso de regressão de quem tinha acabado de cair de nível. O aviso só saía
// depois, quando a pessoa registrava algo e a Home voltava, ou seja, logo
// depois de ela fazer a coisa certa.
//
// A decisão foi a retomada absorver a jornada: continua sendo a tela calma,
// mas aponta pro hábito em foco e diz a queda ali mesmo, em uma linha.

import { CATEGORY_MAP } from "@/components/categoryUtils";
import { JOURNEY_ORDER } from "./goals";

// Rótulos de convite, mais quentes que o `subtitle` do CATEGORY_MAP, que é
// instrução de tela de registro. Aqui o tom é de porta de entrada.
const CONVITE = {
  water: "Um copo d'água",
  sleep: "Como foi a última noite",
  feeding: "Uma refeição",
  exercise: "O exercício de hoje",
  study: "O tempo de estudo",
};

/**
 * Os dois atalhos de métrica da retomada, com o foco na frente.
 *
 * Sem foco (lvl 0, ou jornada indisponível) cai no par original da tela:
 * água e sono, nessa ordem.
 *
 * @param {string|null|undefined} focus
 * @returns {Array<{metric: string, label: string}>}
 */
export function retomadaShortcuts(focus) {
  const ordem = focus
    ? [focus, ...JOURNEY_ORDER.filter((m) => m !== focus)]
    : ["water", "sleep"];
  return ordem.slice(0, 2).map((metric) => ({
    metric,
    label:
      CONVITE[metric] ??
      `Registrar ${CATEGORY_MAP[metric]?.displayName ?? metric}`,
  }));
}

/**
 * A linha que conta a queda, quando há queda a contar.
 *
 * Três coisas em uma frase, nesta ordem: o que aconteceu, o que mudou, e que
 * nada sumiu. Sem sheet e sem botão, porque a tela existe pra convidar um
 * registro, e um terceiro controle competiria com isso.
 *
 * ⚠️ A frase **afirma** que nada se perdeu, enquanto o `RegressionNotice`
 * completo **prova**, com botão pro histórico. É perda consciente (#320): vale
 * mais não emboscar quem voltou do que manter a prova neste caminho.
 *
 * @param {string|null|undefined} focus
 * @returns {string|null}
 */
export function retomadaRegressionLine(focus) {
  if (!focus) return null;
  const nome = CATEGORY_MAP[focus]?.displayName ?? focus;
  return `Uns dias em branco fizeram o nível voltar. O foco agora é ${nome}, e nada do que você registrou se perdeu.`;
}
