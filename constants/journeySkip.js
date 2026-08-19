// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Pular nível com conferência do histórico (#295): tela 4a·6 do Turno 4.
//
// ⚠️ **O critério pra pular é o MESMO critério do portão.** Não se pula o
// portão: entra-se nele já qualificado, com evidência avaliada sobre a mesma
// janela de 28 dias que qualquer um enfrenta. Não há o que burlar, porque a
// exigência é idêntica à do caminho normal (§9 do modelo).
//
// O que a concessão encurta é a ESPERA: graduar normalmente exige a barra
// alta sustentada; aqui a evidência do portão basta. Quem chega com o hábito
// pronto não precisa provar de novo o que já está no histórico.
//
// Duas coisas da tela que não são decoração:
//
// - **números concretos, não veredito.** O app mostra o que viu: dias com
//   registro, dispersão do horário, em vez de dar uma nota.
// - **antecipa o caso oposto.** Dizer de antemão o que acontece se não bater
//   é o que impede a tela de virar interrogatório: não confia cego, mas
//   também não desconfia hostil.

import { CATEGORY_MAP } from "@/components/categoryUtils";
import { passesGate } from "./journey";

const nomeDe = (metric) => CATEGORY_MAP[metric]?.displayName ?? metric;

/**
 * O histórico sustenta a alegação?
 *
 * Delegado inteiro ao `passesGate` de propósito: se um dia o portão mudar, o
 * critério pra pular muda junto, sem ninguém precisar lembrar de sincronizar
 * dois lugares.
 *
 * @param {object} signals Saída de `habitSignals`.
 * @param {object} [thresholds]
 * @returns {boolean}
 */
export function skipQualifies(signals, thresholds) {
  return passesGate(signals, thresholds);
}

/**
 * Os números que o app viu, prontos pra exibir.
 *
 * Cada linha é um fato observável, não uma avaliação. `—` quando não há
 * amostra pra afirmar nada: dizer "0 min de variação" com dois registros
 * seria inventar precisão.
 *
 * @param {object} signals
 * @param {number} janela Dias da janela.
 * @returns {Array<{label: string, value: string}>}
 */
export function skipEvidence(signals, janela) {
  const { consistency, regularity } = signals ?? {};
  const dias = consistency?.days ?? janela;
  const sd = regularity?.sdMinutes;

  return [
    {
      label: "Dias com registro",
      value: `${consistency?.hits ?? 0} / ${dias} dias`,
    },
    {
      label: "Variação do horário",
      value: sd == null ? "—" : `± ${Math.round(sd)} min`,
    },
    {
      label: "Registros na janela",
      value: `${regularity?.n ?? 0}`,
    },
  ];
}

/**
 * Copy da tela, nos dois desfechos.
 *
 * @param {{metric: string, claim?: string, qualifies: boolean, nextLevel: number}} args
 */
export function skipCopy({ metric, qualifies, nextLevel }) {
  const nome = nomeDe(metric);

  return {
    claimLabel: "você disse",
    claim: `"Já cuido de ${nome}, quero pular."`,
    evidenceLabel: "o que o histórico mostra",

    verdict: qualifies
      ? `Bate com o que você disse. Você começa direto no lvl ${nextLevel}, e ${nome} já entra estável.`
      : `O histórico ainda não mostra isso. Começamos no lvl 1 e ${nome} entra estável quando os dados acompanharem.`,

    // Antecipar o desfecho oposto tira o peso de julgamento dos dois lados.
    alternate: qualifies
      ? "Se não batesse, o app começaria no lvl 1 e observaria por duas semanas antes de considerar estável, sem drama."
      : "Nada foi descartado: seus registros continuam contando, e a conferência refaz sozinha conforme o histórico cresce.",

    dismiss: "Refazer",
    confirm: qualifies ? `Começar no lvl ${nextLevel}` : "Entendi",
  };
}
