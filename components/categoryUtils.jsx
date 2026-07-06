export const CATEGORY_MAP = {
  water: {
    displayName: "água",
    unity: "ml",
  },
  sleep: {
    displayName: "sono",
    unity: "h",
  },
  exercise: {
    displayName: "exercício",
    unity: "h",
  },
  feeding: {
    displayName: "alimentação",
    unity: "Refeições",
  },
  study: {
    displayName: "estudo",
    unity: "h",
  },
};

export function getCategoryInfo(key) {
  return {
    displayName: CATEGORY_MAP[key]?.displayName ?? key,
    exists: !!CATEGORY_MAP[key],
    key: CATEGORY_MAP[key]?.key ?? key,
    unity: CATEGORY_MAP[key]?.unity ?? null,
  };
}
