// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTable, useValue } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import MetricIcon from "@/components/MetricIcon";
import { goBack } from "@/constants/navigation";
import { useThemeTokens } from "@/constants/themeTokens";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { getGoals, getGraduatedAt, store } from "@/infra/database";
import { goalFor } from "@/constants/goals";
import { dailyVerdicts } from "@/constants/habitSignals";
import { METRIC_TINT } from "@/constants/journeyHome";
import {
  stableChip,
  stableExplanation,
  stableForDays,
  stableRegisterLabel,
  stableStrip,
} from "@/constants/stableHabit";

// Detalhe do hábito estável (#297, tela 4a·5 do Turno 4).
//
// Onde mora o hábito que virou automático. Chegou aqui porque a linha
// compacta dele na Home deixou de ir direto pro registro — é um toque a mais
// pra registrar algo que já não precisa de atenção diária, e é o ponto: a
// tela existe pra dar lugar ao que saiu do foco sem sumir.
//
// Três escolhas de tom, todas do design:
//
// 1. **Chip cinza, nunca verde.** Status, não medalha. Verde segue reservado
//    pro "hoje", uso já canônico do app.
// 2. **Explicação sem eufemismo.** A frase admite que o app ESTAVA medindo a
//    pessoa e diz que parou. Não embeleza.
// 3. **Botão de registrar é ghost.** Presente, sem competir.

const JANELA = 28;

export default function HabitoEstavel() {
  const { metric } = useLocalSearchParams();
  const t = useThemeTokens();
  const records = useTable("records", store);
  const graduatedRaw = useValue("journeyGraduatedAt", store);

  const info = CATEGORY_MAP[metric];

  const dados = useMemo(() => {
    const lista = Object.values(records ?? {});
    const verdicts = dailyVerdicts(
      lista,
      metric,
      goalFor(getGoals(), metric),
      JANELA,
    );
    const desde = getGraduatedAt()[metric];
    return {
      strip: stableStrip(verdicts),
      dias: stableForDays(desde),
    };
    // `graduatedRaw` não é lido aqui dentro, mas É a assinatura: getGraduatedAt
    // lê o store direto, e sem ele na lista o memo não recalcularia quando a
    // data mudasse. Mesmo padrão do `goals` em ajustes.jsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, metric, graduatedRaw]);

  if (!info) return null;

  const nome = `${info.displayName.charAt(0).toUpperCase()}${info.displayName.slice(1)}`;
  const explicacao = stableExplanation(metric);

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => goBack()}
          className="flex-row items-center gap-1 self-start rounded-full p-1 pr-2 active:opacity-70"
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

        {/* Cabeçalho: nome + chip de status. O chip usa cinza de label, NUNCA
            verde — é status, não medalha. */}
        <View className="flex-row items-center gap-3">
          <View
            className={`items-center justify-center rounded-xl ${METRIC_TINT[metric] ?? ""}`}
            style={{ width: 44, height: 44 }}
          >
            <MetricIcon metric={metric} size={24} color={t.primary} />
          </View>
          <View className="flex-1">
            <Text
              className="text-2xl text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {nome}
            </Text>
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular", marginTop: 2 }}
            >
              {stableChip(dados.dias)}
            </Text>
          </View>
        </View>

        {/* O que "estável" quer dizer. Bloco neutro, sem eufemismo. */}
        <View className="gap-1.5 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark p-4">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            {explicacao.label}
          </Text>
          <Text
            className="text-sm text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_400Regular", lineHeight: 21 }}
          >
            {explicacao.body}
          </Text>
        </View>

        {/* Últimos 14 dias. Cada dia é um traço: preenchido quando houve
            registro no alvo. Sem números — a forma já conta a história. */}
        <View className="gap-2">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            últimos 14 dias
          </Text>
          <View className="flex-row items-end gap-1">
            {dados.strip.days.map((d) => (
              <View
                key={d.dia}
                className={`flex-1 rounded-sm ${
                  d.hit
                    ? "bg-primary dark:bg-primary-dark"
                    : "bg-border-subtle dark:bg-border-subtle-dark"
                }`}
                style={{ height: d.hit ? 22 : 10 }}
              />
            ))}
          </View>
          <View className="flex-row justify-between">
            <Text
              className="text-xs text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              {dados.strip.from}
            </Text>
            <Text
              className="text-xs text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              {dados.strip.to}
            </Text>
          </View>
        </View>

        {/* Ghost: presente, sem competir. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stableRegisterLabel(metric)}
          onPress={() => router.navigate(`/(metrics)/${metric}`)}
          className="rounded-xl border border-border-strong dark:border-border-strong-dark py-3 active:opacity-70"
        >
          <Text
            className="text-center text-sm text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {stableRegisterLabel(metric)}
          </Text>
        </Pressable>
      </ScrollView>
    </MyView>
  );
}
