// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTable } from "tinybase/ui-react";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";
import WeekStrip from "@/components/WeekStrip";

import { store } from "@/infra/database";
import { METRIC_KEYS_ORDER, summarizeWeek } from "@/infra/week";
import { useThemeTokens } from "@/constants/themeTokens";

// Tela Semana (M5-B fatia 3, mockup 2a·7).
// Header mono + h1 + subtitle → strip de 7 dias com barrinhas por métrica →
// lista "por métrica" com stat resumo. Sem tab bar por enquanto (Home segue
// no hamburger); introduzir tab bar é decisão maior, fica pra próxima fatia.

export default function Semana() {
  const t = useThemeTokens();
  const records = useTable("records", store);
  // Recalcula quando a tabela muda (mesmo padrão da Home).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summary = useMemo(() => summarizeWeek(), [records]);

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav bar: back → HOJE */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => goBack()}
            className="flex-row items-center gap-1 rounded-full p-1 pr-2 active:opacity-70"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={t.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text
              className="text-base text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Voltar
            </Text>
          </Pressable>
        </View>

        {/* Header */}
        <View className="gap-1 px-1">
          <Text
            className="text-xs tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            {summary.header.weekLabel}
          </Text>
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {summary.header.title}
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            {summary.header.subtitle}
          </Text>
        </View>

        {/* Day strip */}
        <WeekStrip days={summary.days} />

        {/* Per metric */}
        <View className="gap-2.5">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Por métrica
          </Text>
          {METRIC_KEYS_ORDER.map((key) => {
            const m = summary.perMetric[key];
            return (
              <View
                key={key}
                className="flex-row items-center justify-between rounded-xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4 py-3"
              >
                <Text
                  className="text-sm text-ink dark:text-ink-dark"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {m.label}
                </Text>
                <Text
                  className="text-sm text-body-secondary dark:text-body-secondary-dark"
                  style={{ fontFamily: "JetBrainsMono_400Regular" }}
                >
                  {m.stat}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </MyView>
  );
}
