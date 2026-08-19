// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Partes puras da Home com níveis (#291, fatia 2).
//
// Ficam fora do componente pelo mesmo motivo do `bannerPriority.js`: importar
// a Home no jest puxa a cadeia toda até AsyncStorage. Aqui mora o que tem
// risco de bug: qual ação rápida, qual copy, o que vai pra cada zona.
//
// Telas 4a·1 e 4a·3 do Turno 4 do Claude Design.

import { CATEGORY_MAP } from "@/components/categoryUtils";
import { JOURNEY_ORDER } from "./goals";
import { BUILDING, LOCKED, PAUSED } from "./journey";

/** Tint do container de ícone, por métrica. Tokens já existentes. */
export const METRIC_TINT = {
  sleep: "bg-tint-blue dark:bg-tint-blue-dark",
  water: "bg-tint-blue dark:bg-tint-blue-dark",
  feeding: "bg-tint-green dark:bg-tint-green-dark",
  exercise: "bg-tint-red dark:bg-tint-red-dark",
  study: "bg-tint-yellow dark:bg-tint-yellow-dark",
};

/**
 * Ações rápidas do card de foco, por métrica.
 *
 * ⚠️ **Sono não tem incremento, e isso não é omissão.** O design mostra
 * `+200ml / +300ml / +500ml`, que serve pra água, mas sono se registra por
 * horário de deitar e acordar, não por quantidade acumulada. E sono é o
 * **primeiro** foco da jornada: o card do lvl 1, o primeiro que qualquer
 * pessoa vê, é justamente o que não tem incremento sensato.
 *
 * Métrica sem incremento devolve lista vazia, e o card cai num botão único
 * que abre a tela de registro (ver `hasQuickAdd`).
 */
export const QUICK_ADD = {
  water: [200, 300, 500],
  feeding: [1],
  exercise: [15, 30],
  study: [15, 30],
  sleep: [],
};

/** A métrica aceita incremento direto da Home? */
export function hasQuickAdd(metric) {
  return (QUICK_ADD[metric] ?? []).length > 0;
}

/**
 * Rótulo do botão de incremento, na unidade que a pessoa lê.
 *
 * @param {string} metric
 * @param {number} valor
 */
export function quickAddLabel(metric, valor) {
  const unit = CATEGORY_MAP[metric]?.unit;
  if (unit === "refeição") return valor === 1 ? "+1 refeição" : `+${valor}`;
  if (unit === "min") return `+${valor} min`;
  return `+${valor}${unit ?? ""}`;
}

/**
 * Chip de contexto do header: `lvl N · <hábito>`.
 *
 * O nível é **contexto, não pontuação**, e por isso vive num chip discreto e
 * nunca como número grande (docs/11-modelo-de-niveis.md §1.5).
 */
export function levelChip(level, focus) {
  if (!focus) return `lvl ${level}`;
  return `lvl ${level} · ${CATEGORY_MAP[focus]?.displayName ?? focus}`;
}

/**
 * Copy do header, derivada do estado da jornada.
 *
 * Tom: reforço sóbrio. Reconhece o que já está de pé sem elogiar, e diz o que
 * está sendo construído sem cobrar.
 *
 * @param {{level: number, focus: string|null, habits: object, regressed: boolean}} journey
 * @returns {{title: string, subtitle: string}}
 */
export function headerCopy(journey) {
  const { focus, habits, regressed } = journey ?? {};

  if (!focus) {
    // lvl 0: nada conquistado ainda. Convite, não vazio.
    return {
      title: "Só registrar hoje.",
      subtitle: "Qualquer coisa. O que aparecer.",
    };
  }

  const nome = CATEGORY_MAP[focus]?.displayName ?? focus;
  const estaveis = JOURNEY_ORDER.filter(
    (m) => m !== focus && habits?.[m]?.status === "graduated",
  ).map((m) => CATEGORY_MAP[m]?.displayName ?? m);

  if (regressed) {
    // Sem culpa e sem vermelho: o esforço de volta é dimensionado como curto.
    return {
      title: "Recomeço curto.",
      subtitle: `Alguns dias com regularidade em ${nome} e o resto volta pro foco.`,
    };
  }

  const title = `Construindo hoje: ${nome}.`;
  if (estaveis.length === 0) {
    return { title, subtitle: "Sem pressa. Um de cada vez." };
  }
  // "já é seu" reconhece sem premiar: reforço sóbrio.
  const lista =
    estaveis.length === 1
      ? `${estaveis[0]} já é seu`
      : `${estaveis.slice(0, -1).join(", ")} e ${estaveis.at(-1)} já são seus`;
  return {
    title,
    subtitle: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}.`,
  };
}

/**
 * Divide as métricas entre a zona de foco e a de "resto do dia".
 *
 * **Nada some**: é a decisão central do design (hierarquia, não exclusão).
 * Métrica trancada continua na lista, só sem valor a mostrar. Por isso o
 * rodapé promete "tudo continua registrável", e a promessa precisa ser
 * verdadeira.
 *
 * @returns {{focus: string|null, rest: string[]}}
 */
export function splitZones(journey) {
  const focus = journey?.focus ?? null;
  const rest = JOURNEY_ORDER.filter((m) => m !== focus);
  return { focus, rest };
}

/**
 * Legenda de estado da linha compacta. `null` quando não há o que dizer —
 * silêncio é melhor que rótulo redundante.
 */
export function restBadge(status) {
  if (status === "graduated") return "estável";
  if (status === PAUSED) return "em pausa";
  if (status === LOCKED) return null;
  if (status === BUILDING) return null;
  return null;
}
