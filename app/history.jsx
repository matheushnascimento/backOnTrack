// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTable } from "tinybase/ui-react";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";
import { HistoryCard } from "@/components/MyHistory";

import { getByDate, store } from "@/infra/database";
import { CATEGORY_MAP, getCategoryInfo } from "@/components/categoryUtils";
import { useThemeTokens } from "@/constants/themeTokens";
//#endregion

// Ordem canônica das métricas (mesma da tela "hoje").
const METRICS = Object.keys(CATEGORY_MAP);

// Zera a hora pra comparar/derivar dias sem ruído de fuso. O getByDate compara
// ano/mês/dia local, então o dia "cheio" é o suficiente.
function startOfDay(input) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(input, n) {
  const d = startOfDay(input);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// "SEG · 04 AGO 2026": label mono do card de navegação.
function formatMonoDate(d) {
  const weekday = d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  const day = String(d.getDate()).padStart(2, "0");
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  const year = d.getFullYear();
  return `${weekday} · ${day} ${month} ${year}`.toUpperCase();
}

export default function History() {
  const t = useThemeTokens();
  const [date, setDate] = useState(() => startOfDay(new Date()));

  // Assina a tabela: re-renderiza a cada mudança nos registros (edição, exclusão
  // e também o fim do `startAutoLoad()` da persistência). Ler só no foco perdia
  // a carga inicial assíncrona. Ver #108.
  const records = useTable("records", store);

  // Registros do dia agrupados por type (uma passada só, via getByDate).
  // `records` é gatilho de propósito (ver #108); remover a dep, como o
  // exhaustive-deps sugere, faria o histórico não atualizar ao excluir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const day = useMemo(() => getByDate(date.toISOString()), [date, records]);

  const isToday = isSameDay(date, new Date());
  const sections = METRICS.filter((type) => (day[type]?.length ?? 0) > 0);

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav: back */}
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
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Histórico
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            Navegue pelos dias e revise seus registros.
          </Text>
        </View>

        {/* Date nav card */}
        <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Chevron
              direction="left"
              onPress={() => setDate((d) => addDays(d, -1))}
              color={t.primary}
            />
            <Text
              className="flex-1 text-center text-xs tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {formatMonoDate(date)}
            </Text>
            <Chevron
              direction="right"
              onPress={() => setDate((d) => addDays(d, 1))}
              color={isToday ? t.iconDim : t.primary}
              disabled={isToday}
            />
          </View>
          {!isToday && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar pra hoje"
              onPress={() => setDate(startOfDay(new Date()))}
              className="items-center rounded-xl bg-surface-subtle dark:bg-surface-subtle-dark py-2 active:opacity-70"
            >
              <Text
                className="text-sm text-primary dark:text-primary-dark"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Voltar pra hoje
              </Text>
            </Pressable>
          )}
        </View>

        {/* Registros do dia */}
        {sections.length === 0 ? (
          <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-6">
            <Text
              className="text-center text-sm text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Nenhum registro neste dia. Sem pressa.
            </Text>
          </View>
        ) : (
          sections.map((type) => {
            const { displayName, unit } = getCategoryInfo(type);
            const capName =
              displayName.charAt(0).toUpperCase() + displayName.slice(1);
            return (
              <View key={type} className="gap-2">
                <Text
                  className="px-1 text-xs uppercase tracking-wider text-label dark:text-label-dark"
                  style={{ fontFamily: "JetBrainsMono_500Medium" }}
                >
                  {capName}
                </Text>
                {day[type].map((obj) => (
                  <HistoryCard
                    key={obj.id}
                    obj={obj}
                    tableName={type}
                    displayName={displayName}
                    unit={unit}
                    exercise={type === "exercise"}
                    hideDate
                    // Sem onChanged: o useTable acima já assina a store e
                    // re-renderiza quando um registro é excluído.
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </MyView>
  );
}

/** @param {{ direction: "left" | "right", onPress: () => void, color: string, disabled?: boolean }} props */
function Chevron({ direction, onPress, color, disabled }) {
  const d = direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === "left" ? "Dia anterior" : "Próximo dia"}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center rounded-full p-2 ${
        disabled ? "" : "active:opacity-70"
      }`}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d={d}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
