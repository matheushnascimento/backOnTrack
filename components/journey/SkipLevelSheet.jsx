// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { Modal, Pressable, Text, View } from "react-native";

import MetricIcon from "@/components/MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";
import { METRIC_TINT } from "@/constants/journeyHome";

// Pular nível com conferência do histórico (#295, tela 4a·6 do Turno 4).
//
// A tela tem um risco de tom específico: virar interrogatório. O design
// resolve com dois movimentos, e os dois estão aqui:
//
// 1. **Números concretos, não veredito.** O bloco do meio lista o que o app
//    viu — dias com registro, dispersão do horário — sem dar nota.
// 2. **O caso oposto vem antecipado.** Dizer de antemão o que aconteceria se
//    não batesse deixa claro que o app não confia cego, mas também não
//    desconfia hostil.

/**
 * @param {{
 *   visible: boolean,
 *   metric: string,
 *   copy: object,
 *   evidence: Array<{label: string, value: string}>,
 *   qualifies: boolean,
 *   onDismiss: () => void,
 *   onConfirm: () => void,
 * }} props
 */
export default function SkipLevelSheet({
  visible,
  metric,
  copy,
  evidence,
  qualifies,
  onDismiss,
  onConfirm,
}) {
  const t = useThemeTokens();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onDismiss}
        className="flex-1"
        style={{ backgroundColor: "#0F141988" }}
      />
      <View className="rounded-t-3xl bg-white dark:bg-card-dark px-5 pt-5 pb-8">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          {copy.claimLabel}
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View
            className={`items-center justify-center rounded-xl ${METRIC_TINT[metric] ?? ""}`}
            style={{ width: 36, height: 36 }}
          >
            <MetricIcon metric={metric} size={20} color={t.primary} />
          </View>
          <Text
            className="flex-1 text-base text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {copy.claim}
          </Text>
        </View>

        {/* O que o app viu. Fatos, não nota. */}
        <Text
          className="mt-4 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          {copy.evidenceLabel}
        </Text>
        <View className="mt-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark">
          {evidence.map((linha, i) => (
            <View
              key={linha.label}
              className={`flex-row items-center justify-between px-3.5 py-2.5 ${
                i > 0
                  ? "border-t border-border-subtle dark:border-border-subtle-dark"
                  : ""
              }`}
            >
              <Text
                className="flex-1 text-sm text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {linha.label}
              </Text>
              <Text
                className="text-sm text-ink dark:text-ink-dark"
                style={{ fontFamily: "JetBrainsMono_400Regular" }}
              >
                {linha.value}
              </Text>
            </View>
          ))}
        </View>

        <Text
          className="mt-3.5 text-sm text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_400Regular", lineHeight: 21 }}
        >
          {copy.verdict}
        </Text>

        {/* O desfecho oposto, dito de antemão. */}
        <Text
          className="mt-2 text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "Inter_400Regular", lineHeight: 18 }}
        >
          {copy.alternate}
        </Text>

        <View className="mt-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.dismiss}
            onPress={onDismiss}
            className="flex-1 rounded-xl border border-border-strong dark:border-border-strong-dark py-3 active:opacity-70"
          >
            <Text
              className="text-center text-sm text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {copy.dismiss}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.confirm}
            onPress={qualifies ? onConfirm : onDismiss}
            className="flex-1 rounded-xl bg-primary dark:bg-primary-dark py-3 active:opacity-70"
          >
            <Text
              className="text-center text-sm text-white dark:text-on-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {copy.confirm}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
