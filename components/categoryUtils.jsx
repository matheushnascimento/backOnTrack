import { Dumbbell, Moon, Water } from "lucide-react-native";

export const CATEGORY_MAP = {
  water: {
    displayName: "água",
    Icon: Water,
    unity: "ml",
  },
  sleep: {
    displayName: "sono",
    Icon: Moon,
    unity: "h",
  },
  exercise: {
    displayName: "exercício",
    Icon: Dumbbell,
    unity: "h",
  },
};

export function getCategoryInfo(key) {
  return {
    displayName: CATEGORY_MAP[key]?.displayName ?? key,
    Icon: CATEGORY_MAP[key]?.Icon ?? null,
    exists: !!CATEGORY_MAP[key],
    key: CATEGORY_MAP[key]?.key ?? key,
    unity: CATEGORY_MAP[key].unity,
  };
}
