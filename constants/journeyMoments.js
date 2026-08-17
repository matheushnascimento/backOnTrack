// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Momentos da jornada (#293, fatia 3a) — telas 4a·2 e 4a·4 do Turno 4.
//
// Um momento aparece UMA VEZ e some. Quem garante isso é o `journeyAckLevel`
// no store: o nível que a pessoa já viu. Sem ele o aviso de regressão
// reapareceria em toda abertura do app.
//
// Tom: reforço sóbrio (docs/11-modelo-de-niveis.md §1.5). Subir de nível é
// reconhecimento em prosa, não celebração — sem confete, sem verde de vitória,
// sem "🎉". E a regressão não tem vermelho nem palavra de culpa.

import { CATEGORY_MAP } from "@/components/categoryUtils";

export const MOMENT_LEVEL_UP = "level-up";
export const MOMENT_REGRESSION = "regression";

/**
 * Que momento está pendente, se algum.
 *
 * @param {number} level Nível derivado agora.
 * @param {number} ackLevel Último nível reconhecido. `-1` = nunca reconheceu.
 * @returns {"level-up"|"regression"|null}
 */
export function pendingMoment(level, ackLevel) {
  if (!Number.isFinite(level)) return null;
  const ack = Number.isFinite(ackLevel) ? ackLevel : -1;
  // Primeira abertura: não há passado, então não há momento. Mostrar "subiu de
  // nível" pra quem acabou de instalar o app seria comemorar o nada.
  if (ack < 0) return null;
  if (level > ack) return MOMENT_LEVEL_UP;
  if (level < ack) return MOMENT_REGRESSION;
  return null;
}

/**
 * Qual hábito foi conquistado ao chegar neste nível.
 *
 * ⚠️ **`null` abaixo do lvl 2, e isso não é detalhe.** No lvl 1 o primeiro
 * hábito está sendo CONSTRUÍDO, não conquistado — nada virou seu ainda.
 * Sem esta guarda o sheet diria "Sono virou seu" tendo "Sono" também como
 * próximo foco: o mesmo hábito nos dois papéis, na primeira subida que a
 * pessoa veria.
 *
 * @param {number} level
 * @param {string[]} order Ordem da jornada.
 */
export function achievedHabit(level, order) {
  if (!Number.isFinite(level) || level < 2) return null;
  return (order ?? [])[level - 2] ?? null;
}

const nomeDe = (metric) => CATEGORY_MAP[metric]?.displayName ?? metric;
const capitalizar = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * Copy do sheet de subir de nível (4a·4).
 *
 * Três movimentos, nessa ordem:
 * 1. **nomeia o que virou seu** — "Sono virou seu" é reconhecimento em prosa;
 * 2. **explica o que muda** — para de cobrar atenção;
 * 3. **antecipa a queda** — "sem drama". Tirar peso do futuro antes que ele
 *    chegue é o que impede o reconhecimento de virar dívida.
 *
 * @param {{from: number, to: number, achieved: string, next: string|null}} args
 */
export function levelUpCopy({ from, to, achieved, next }) {
  const conquistado = capitalizar(nomeDe(achieved));
  const proximo = next ? nomeDe(next) : null;

  return {
    steps: `lvl ${from} → lvl ${to}`,
    title: `${conquistado} virou seu.`,
    body: "Últimas semanas com regularidade. A partir de agora ele fica no ar sem cobrar atenção.",
    nextLabel: proximo ? "próximo foco" : null,
    nextName: proximo ? capitalizar(proximo) : null,
    nextHint: proximo ? (CATEGORY_MAP[next]?.subtitle ?? null) : null,
    // O ponto mais importante da tela: a queda já vem anunciada, e sem peso.
    reassurance: `${conquistado} continua na tela. Se ficar instável por uns dias, o foco volta pra ele, sem drama.`,
    dismiss: "Depois",
    confirm: proximo ? `Começar com ${proximo}` : "Continuar",
  };
}

/**
 * Copy do aviso de regressão (4a·2).
 *
 * ⚠️ **"voltamos", primeira pessoa do plural.** O app voltou junto — não é a
 * pessoa que falhou sozinha. E o hábito fica **"em pausa"**, nunca "perdido".
 *
 * A promessa de que nada sumiu vem acompanhada de um botão pro histórico:
 * provar em vez de afirmar.
 *
 * @param {{focus: string, paused: string[]}} args
 */
export function regressionCopy({ focus, paused }) {
  const foco = nomeDe(focus);
  const pausados = (paused ?? []).map(nomeDe);
  const quem =
    pausados.length === 0
      ? "Um hábito"
      : pausados.length === 1
        ? capitalizar(pausados[0])
        : `${capitalizar(pausados.slice(0, -1).join(", "))} e ${pausados.at(-1)}`;
  const verbo = pausados.length > 1 ? "ficaram" : "ficou";

  return {
    title: `voltamos pra ${foco}`,
    body: `${quem} ${verbo} uns dias em branco. O foco volta pra ${foco} por um tempo. Quando ela estiver de novo estável, o resto retoma.`,
    // Dito em voz alta porque é a dúvida que a regressão levanta.
    preserved:
      "Nada do que você já registrou foi perdido. Você continua podendo registrar tudo.",
    history: "Ver histórico",
    dismiss: "Entendi",
  };
}
