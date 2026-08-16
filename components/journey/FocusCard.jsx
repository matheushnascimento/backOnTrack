// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { Pressable, Text, View } from "react-native";

import MetricIcon from "@/components/MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";
import {
  METRIC_TINT,
  QUICK_ADD,
  hasQuickAdd,
  quickAddLabel,
} from "@/constants/journeyHome";

// Card do hábito em construção (#291, tela 4a·1 do Turno 4).
//
// É o único card com número grande e botões visíveis — é isso que cria a
// hierarquia sem esconder nada. As demais métricas viram linhas compactas de
// metade da altura, mas seguem tapáveis (`CompactRow`).
//
// ⚠️ **Sem confete, sem barra de progresso, sem verde de vitória.** O nível é
// contexto, não prêmio (docs/11-modelo-de-niveis.md §1.5). O verde continua
// reservado pro "hoje", que é uso já canônico.

/**
 * @param {{
 *   metric: string,
 *   name: string,
 *   value: string,
 *   unit?: string,
 *   count: number,
 *   onQuickAdd: (valor: number) => void,
 *   onOpen: () => void,
 * }} props
 */
export default function FocusCard({
  metric,
  name,
  value,
  unit,
  count,
  onQuickAdd,
  onOpen,
}) {
  const t = useThemeTokens();
  const incrementos = QUICK_ADD[metric] ?? [];

  return (
    <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-4">
      <View className="flex-row items-center gap-3">
        <View
          className={`items-center justify-center rounded-xl ${METRIC_TINT[metric] ?? ""}`}
          style={{ width: 40, height: 40 }}
        >
          <MetricIcon metric={metric} size={22} color={t.primary} />
        </View>
        <View className="flex-1">
          <Text
            className="text-lg text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {name}
          </Text>
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_400Regular", marginTop: 2 }}
          >
            {count === 1 ? "1 registro hoje" : `${count} registros hoje`}
          </Text>
        </View>
        {/* Número grande — o único da tela. Alinhado à direita pra não
            competir com o nome. */}
        <View className="flex-row items-baseline gap-1">
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {value}
          </Text>
          {unit ? (
            <Text
              className="text-xs text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {unit}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Ação rápida. Métrica sem incremento natural (sono) cai num botão
          único que abre a tela — ver QUICK_ADD. */}
      <View className="mt-3.5 flex-row gap-2">
        {hasQuickAdd(metric) ? (
          <>
            {incrementos.map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${quickAddLabel(metric, v)} em ${name}`}
                onPress={() => onQuickAdd(v)}
                className="flex-1 rounded-xl border border-border-subtle dark:border-border-subtle-dark bg-light-background dark:bg-app-dark py-2.5 active:opacity-70"
              >
                <Text
                  className="text-center text-xs text-ink dark:text-ink-dark"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {quickAddLabel(metric, v)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Registrar ${name} com outro valor`}
              onPress={onOpen}
              className={`flex-1 rounded-xl py-2.5 active:opacity-70 ${METRIC_TINT[metric] ?? ""}`}
            >
              <Text
                className="text-center text-xs text-primary dark:text-primary-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                outro
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Registrar ${name}`}
            onPress={onOpen}
            className={`flex-1 rounded-xl py-2.5 active:opacity-70 ${METRIC_TINT[metric] ?? ""}`}
          >
            <Text
              className="text-center text-xs text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Registrar
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
