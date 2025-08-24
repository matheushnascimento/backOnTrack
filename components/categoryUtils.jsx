import { Water, Moon } from "lucide-react-native";

export const CATEGORY_MAP = {
  water: {
    displayName: "água",
    Icon: Water,
  },
  sleep: {
    displayName: "sono",
    Icon: Moon,
  },
};

export function getCategoryInfo(key) {
  return {
    displayName: CATEGORY_MAP[key]?.displayName ?? key,
    Icon: CATEGORY_MAP[key]?.Icon ?? null,
    exists: !!CATEGORY_MAP[key],
    key: CATEGORY_MAP[key]?.key ?? key,
  };
}
