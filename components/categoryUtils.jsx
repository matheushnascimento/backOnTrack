// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
export const CATEGORY_MAP = {
  water: {
    displayName: "água",
    unit: "ml",
    subtitle: "Adicionar quanto bebeu agora.",
  },
  sleep: {
    displayName: "sono",
    unit: "min",
    subtitle: "Quando dormiu e acordou?",
  },
  exercise: {
    displayName: "exercício",
    unit: "min",
    subtitle: "Registrar o exercício de hoje.",
  },
  feeding: {
    displayName: "alimentação",
    unit: "refeição",
    subtitle: "Registrar refeição.",
  },
  study: {
    displayName: "estudo",
    unit: "min",
    subtitle: "Registrar o tempo de estudo.",
  },
};

export function getCategoryInfo(key) {
  return {
    displayName: CATEGORY_MAP[key]?.displayName ?? key,
    exists: !!CATEGORY_MAP[key],
    key: CATEGORY_MAP[key]?.key ?? key,
    unit: CATEGORY_MAP[key]?.unit ?? null,
    subtitle: CATEGORY_MAP[key]?.subtitle ?? null,
  };
}
