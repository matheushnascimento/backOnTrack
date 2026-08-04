// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, Text, View } from "react-native";

import MetricIcon from "./MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";

// Card de métrica na Home v2 (M5-B fatia 1, direção 1c do design).
// Estrutura: [ícone tinted 44×44] [nome (bold) — direita: valor ou "quando puder"] [detalhe pequeno opcional].
// Toque no card navega pra `/(metrics)/<metric>` (registro rápido).
//
// Estado é derivado por quem chama:
//   - active=true  → ícone tint-blue + brand-blue; valor destacado (mono).
//   - active=false → ícone surface-subtle + label gray; "quando puder".
//
// Props:
//   metric       — key ("water" | "sleep" | ...); usada pro SVG do ícone.
//   name         — displayName ("Água", "Sono", ...).
//   active       — bool: teve registro hoje?
//   value        — string à direita: valor formatado ("1.400 ml", "7h20", "3 refeições") ou null.
//   detail       — string abaixo (pequena): "3 registros", etc. Opcional.
//   onPress      — handler do toque.
export default function MetricCard({
  metric,
  name,
  active,
  value,
  detail,
  onPress,
}) {
  const t = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Métrica ${name}${active ? `, ${value}` : ", sem registros"}`}
      className="w-full flex-row items-center gap-3 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-4 active:opacity-70"
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-tint-blue dark:bg-tint-blue-dark" : "bg-surface-subtle dark:bg-surface-subtle-dark"}`}
      >
        <MetricIcon
          metric={metric}
          size={22}
          color={active ? t.primary : t.label}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-sm text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {name}
          </Text>
          <Text
            className={
              active
                ? "text-xs text-body-secondary dark:text-body-secondary-dark"
                : "text-xs text-label dark:text-label-dark"
            }
            style={{
              fontFamily: active
                ? "JetBrainsMono_500Medium"
                : "Inter_400Regular",
            }}
          >
            {active ? value : "quando puder"}
          </Text>
        </View>
        {detail ? (
          <Text
            className="text-xs text-label dark:text-label-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
