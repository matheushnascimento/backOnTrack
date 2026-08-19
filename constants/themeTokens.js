// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Helper pra tokens de cor que não dão pra expressar como className Tailwind:
// hex passado como prop de SVG (`stroke`, `fill`, MetricIcon `color`),
// `placeholderTextColor` de TextInput, `backgroundColor` inline. Espelha os
// tokens do design v2 (light) + do Turno 3 (dark). Usa `useColorScheme` do
// NativeWind pra respeitar o toggle manual + o `prefers-color-scheme` do OS.
//
// Para classes utilitárias (`bg-*`, `text-*`, `border-*`), continue usando
// `className="... dark:..."`. Este helper existe SÓ pros callsites que não
// aceitam className.

import { useColorScheme } from "nativewind";

const LIGHT = {
  primary: "#2E5A88",
  onPrimary: "#F8F9FA",
  accentToday: "#4CAF50",
  ink: "#0F1419",
  label: "#6B7280",
  bodySecondary: "#4B5563",
  iconDim: "#9CA3AF",
  bgApp: "#F8F9FA",
  bgCard: "#FFFFFF",
  surfaceSubtle: "#F3F4F6",
  borderSubtle: "#E5E7EB",
  borderStrong: "#D1D5DB",
  tintBlue: "#EAF3FB",
  tintRed: "#FEF3F2",
  tintGreen: "#F0FDF4",
  tintYellow: "#FFFBEB",
};

const DARK = {
  primary: "#5B8FC7",
  onPrimary: "#0F1419",
  accentToday: "#5FC463",
  ink: "#ECEEF1",
  label: "#7C8592",
  bodySecondary: "#A8AFB8",
  iconDim: "#7C8592",
  bgApp: "#12161B",
  bgCard: "#1A1F26",
  surfaceSubtle: "#232932",
  borderSubtle: "#2A303A",
  borderStrong: "#3A4250",
  tintBlue: "#1E2A38",
  tintRed: "#332020",
  tintGreen: "#1C2A22",
  tintYellow: "#2F2A1A",
};

export function useThemeTokens() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}
