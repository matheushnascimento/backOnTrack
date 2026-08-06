// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";

import { parseRoadmap, getDigest } from "@/constants/roadmap";
// Caminho relativo de propósito: o babel-plugin-inline-import resolve pelo
// arquivo, não pelo alias @/. Editar o roadmap exige reiniciar com --clear.
import roadmapMd from "../docs/04-roadmap-milestones.md";
import { useThemeTokens } from "@/constants/themeTokens";
//#endregion

const digest = getDigest(parseRoadmap(roadmapMd));

export default function Roadmap() {
  const t = useThemeTokens();
  const {
    milestonesDone,
    milestonesTotal,
    current,
    currentProgress,
    recentDone,
  } = digest;
  const pct = milestonesTotal
    ? Math.round((milestonesDone / milestonesTotal) * 100)
    : 0;

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
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
            ROADMAP
          </Text>
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Back on Track
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            De volta aos trilhos, um registro por vez.
          </Text>
        </View>

        {/* Progresso geral */}
        <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5 gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              Progresso geral
            </Text>
            <Text
              className="text-sm text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              {milestonesDone}/{milestonesTotal}
            </Text>
          </View>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle dark:bg-border-subtle-dark">
            <View
              className="h-full rounded-full bg-secondary dark:bg-secondary-dark"
              style={{ width: `${pct}%` }}
            />
          </View>
          <Text
            className="text-xs text-label dark:text-label-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {milestonesDone === milestonesTotal
              ? "Roadmap fechado."
              : `${milestonesDone === 1 ? "1 milestone concluída" : `${milestonesDone} milestones concluídas`} · ${pct}% do total.`}
          </Text>
        </View>

        {/* Milestone atual */}
        {current && (
          <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5 gap-4">
            <View className="gap-1">
              <Text
                className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                Em andamento · {currentProgress.done}/{currentProgress.total}
              </Text>
              <Text
                className="text-lg text-ink dark:text-ink-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {current.id} · {current.title}
              </Text>
            </View>
            <View className="gap-2.5">
              {current.items.map((item, i) => (
                <ItemRow key={i} status={item.status} text={item.text} />
              ))}
            </View>
          </View>
        )}

        {/* Concluído recentemente */}
        {recentDone.length > 0 && (
          <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5 gap-3">
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              Concluído recentemente
            </Text>
            <View className="gap-2.5">
              {recentDone.map((item, i) => (
                <ItemRow key={i} status="done" text={item.text} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </MyView>
  );
}

/** @param {{ status: "done" | "partial" | "todo", text: string }} props */
function ItemRow({ status, text }) {
  // Bolinha colorida em vez do emoji: done = accentToday, partial = primary,
  // todo = border-strong (vazio). Mais discreto e alinha melhor com o resto
  // do design v2 (WeekStrip usa a mesma paleta pra status de dia).
  const color = {
    done: "bg-secondary dark:bg-secondary-dark",
    partial: "bg-primary dark:bg-primary-dark",
    todo: "bg-border-strong dark:bg-border-strong-dark",
  }[status];
  const textColor =
    status === "todo"
      ? "text-label dark:text-label-dark"
      : "text-ink dark:text-ink-dark";
  return (
    <View className="flex-row items-start gap-3">
      <View className={`mt-1.5 h-2 w-2 rounded-full ${color}`} />
      <Text
        className={`flex-1 text-sm ${textColor}`}
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {text}
      </Text>
    </View>
  );
}
