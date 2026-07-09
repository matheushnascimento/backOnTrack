// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useColorScheme, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

export function useThemedStyles(styleFn) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return StyleSheet.create(styleFn(theme));
}
