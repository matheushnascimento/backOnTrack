// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { goBack } from "@/constants/navigation";
import MetricIcon from "./MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";

// Nav bar + header das telas de registro no visual v2 (M5-B fatia 2, mockups
// 2a·2 e 2a·3 do Claude Design). Padrão:
//
//   [ < Voltar ]                       LABEL_MONO
//
//   [🞿] Título
//   Subtítulo em cor secundária
//
// Componentes bespoke por-métrica (quick-add da água, time pickers do sono)
// vêm em fatias 2a-2c e usam este cabeçalho por cima.
//
// Props:
//   metric    = key da métrica ("water" | ...), usada pro SVG.
//   title     = displayName capitalizado ("Água").
//   subtitle  = string curta. Se omitida, some.
//   label     = mono uppercase à direita. Default: "HOJE".
export default function MetricRegisterHeader({
  metric,
  title,
  subtitle,
  label = "HOJE",
}) {
  const t = useThemeTokens();
  return (
    <View className="gap-4 px-1">
      {/* Nav bar */}
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => goBack()}
          className="flex-row items-center gap-1 rounded-md p-1"
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.ink}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M15 6l-6 6 6 6" />
          </Svg>
          <Text
            className="text-sm text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Voltar
          </Text>
        </Pressable>
        <Text
          className="text-xs tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          {label}
        </Text>
      </View>

      {/* Header: ícone + título + subtítulo */}
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-tint-blue dark:bg-tint-blue-dark">
            <MetricIcon metric={metric} size={18} color={t.primary} />
          </View>
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
