// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, Text, View } from "react-native";

import MetricIcon from "./MetricIcon";

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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Métrica ${name}${active ? `, ${value}` : ", sem registros"}`}
      className="w-full flex-row items-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 active:opacity-70"
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-tint-blue" : "bg-surface-subtle"}`}
      >
        <MetricIcon
          metric={metric}
          size={22}
          color={active ? "#2E5A88" : "#6B7280"}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-sm text-ink"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {name}
          </Text>
          <Text
            className={
              active ? "text-xs text-body-secondary" : "text-xs text-label"
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
            className="text-xs text-label"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
