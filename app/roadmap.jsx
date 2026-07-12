// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { ScrollView, Text, View } from "react-native";

import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";

import { shadow } from "@/constants/Colors";
import { parseRoadmap, getDigest } from "@/constants/roadmap";
// Caminho relativo de propósito: o babel-plugin-inline-import resolve pelo
// arquivo, não pelo alias @/. Editar o roadmap exige reiniciar com --clear.
import roadmapMd from "../docs/04-roadmap-milestones.md";
//#endregion

const STATUS_ICON = { done: "✅", partial: "🟡", todo: "⬜" };
const digest = getDigest(parseRoadmap(roadmapMd));

const CARD =
  "w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard";
const LABEL =
  "font-bold text-xs text-light-text opacity-60 dark:text-dark-text";
const ITEM_TEXT = "flex-1 text-base text-light-text dark:text-dark-text";

function ItemRow({ status, text }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-base">{STATUS_ICON[status] ?? "•"}</Text>
      <Text className={ITEM_TEXT}>{text}</Text>
    </View>
  );
}

export default function Roadmap() {
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
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <MyHeader />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progresso geral */}
        <MyView safe={false} className={`${CARD} gap-2`} style={shadow}>
          <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
            Back on Track
          </Text>
          <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
            De volta aos trilhos, um registro por vez.
          </Text>
          <Text className="font-bold text-base text-light-text opacity-60 dark:text-dark-text">
            {milestonesDone} de {milestonesTotal} milestones concluídas
          </Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-light-background dark:bg-dark-background">
            <View
              className="h-2 rounded-full bg-secondary"
              style={{ width: `${pct}%` }}
            />
          </View>
        </MyView>

        {/* Milestone atual */}
        {current && (
          <MyView safe={false} className={`${CARD} gap-3`} style={shadow}>
            <Text className={LABEL}>EM ANDAMENTO</Text>
            <Text className="font-bold text-lg text-light-text dark:text-dark-text">
              {current.id} · {current.title} ({currentProgress.done}/
              {currentProgress.total})
            </Text>
            <MyView safe={false} className="gap-2">
              {current.items.map((item, i) => (
                <ItemRow key={i} status={item.status} text={item.text} />
              ))}
            </MyView>
          </MyView>
        )}

        {/* Concluído recentemente */}
        {recentDone.length > 0 && (
          <MyView safe={false} className={`${CARD} gap-3`} style={shadow}>
            <Text className={LABEL}>CONCLUÍDO RECENTEMENTE</Text>
            <MyView safe={false} className="gap-2">
              {recentDone.map((item, i) => (
                <ItemRow key={i} status="done" text={item.text} />
              ))}
            </MyView>
          </MyView>
        )}
      </ScrollView>
    </MyView>
  );
}
