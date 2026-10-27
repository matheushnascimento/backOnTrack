// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Text, View } from "react-native";

import { useThemeTokens } from "@/constants/themeTokens";

import TimePickerField from "./TimePickerField";

// Um horário avulso com a mesma cara das linhas de deitar e acordar (o
// `SpanRow` do TimeSpanFields): caixa com borda, rótulo pequeno e o horário
// grande. O TimePickerField sozinho é só um texto tocável, e solto num cartão
// não parece campo (#396: o horário do ritual na edição e o horário-alvo).

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder?: string,
 *   accessibilityLabel?: string,
 * }} props
 */
export default function TimeFieldRow({
  label,
  value,
  onChange,
  placeholder,
  accessibilityLabel,
}) {
  const t = useThemeTokens();
  return (
    <View className="gap-0.5 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {label}
      </Text>
      <TimePickerField
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? label}
        style={{
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: 24,
          color: t.ink,
          padding: 0,
          minWidth: 80,
        }}
      />
    </View>
  );
}
