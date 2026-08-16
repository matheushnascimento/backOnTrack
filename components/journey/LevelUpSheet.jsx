// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { Modal, Pressable, Text, View } from "react-native";

import MetricIcon from "@/components/MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";
import { METRIC_TINT } from "@/constants/journeyHome";

// Momento de subir de nível (#293, tela 4a·4 do Turno 4).
//
// **Bottom sheet, não fullscreen.** A diferença importa: fullscreen trataria
// a subida como interrupção solene; sheet trata como recado. É reconhecimento,
// não cerimônia.
//
// Sem confete, sem verde de vitória, sem "🎉" — reforço sóbrio
// (docs/11-modelo-de-niveis.md §1.5). O reconhecimento vem em prosa: "Sono
// virou seu".
//
// A peça mais importante é a última: `reassurance` antecipa a queda ("sem
// drama") antes que ela aconteça. Reconhecimento que não antecipa a queda
// vira dívida — a pessoa passa a ter algo a perder.

/**
 * @param {{
 *   visible: boolean,
 *   copy: object,
 *   achieved: string,
 *   next: string|null,
 *   onDismiss: () => void,
 *   onConfirm: () => void,
 * }} props
 */
export default function LevelUpSheet({
  visible,
  copy,
  achieved,
  next,
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
      {/* Fundo escurecido: toque fora fecha, como qualquer sheet. */}
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
          {copy.steps}
        </Text>

        <View className="mt-2 flex-row items-center gap-3">
          <View
            className={`items-center justify-center rounded-xl ${METRIC_TINT[achieved] ?? ""}`}
            style={{ width: 40, height: 40 }}
          >
            <MetricIcon metric={achieved} size={22} color={t.primary} />
          </View>
          <Text
            className="flex-1 text-xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {copy.title}
          </Text>
        </View>

        <Text
          className="mt-2.5 text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular", lineHeight: 21 }}
        >
          {copy.body}
        </Text>

        {copy.nextName ? (
          <View className="mt-4 rounded-2xl border border-border-subtle dark:border-border-subtle-dark p-3.5">
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {copy.nextLabel}
            </Text>
            <View className="mt-2 flex-row items-center gap-3">
              <View
                className={`items-center justify-center rounded-lg ${METRIC_TINT[next] ?? ""}`}
                style={{ width: 32, height: 32 }}
              >
                <MetricIcon metric={next} size={18} color={t.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base text-ink dark:text-ink-dark"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {copy.nextName}
                </Text>
                {copy.nextHint ? (
                  <Text
                    className="text-xs text-body-secondary dark:text-body-secondary-dark"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {copy.nextHint}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Antecipa a queda. Tira peso do futuro antes que ele chegue. */}
        <Text
          className="mt-3.5 text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "Inter_400Regular", lineHeight: 18 }}
        >
          {copy.reassurance}
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
            onPress={onConfirm}
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
