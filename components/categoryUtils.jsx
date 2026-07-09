// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
export const CATEGORY_MAP = {
  water: {
    displayName: "água",
    unit: "ml",
  },
  sleep: {
    displayName: "sono",
    unit: "min",
  },
  exercise: {
    displayName: "exercício",
    unit: "min",
  },
  feeding: {
    displayName: "alimentação",
    unit: "refeição",
  },
  study: {
    displayName: "estudo",
    unit: "min",
  },
};

export function getCategoryInfo(key) {
  return {
    displayName: CATEGORY_MAP[key]?.displayName ?? key,
    exists: !!CATEGORY_MAP[key],
    key: CATEGORY_MAP[key]?.key ?? key,
    unit: CATEGORY_MAP[key]?.unit ?? null,
  };
}
