// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
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

// Parseia uma vez, no módulo: o markdown é inlinado em tempo de build pelo
// babel-plugin-inline-import, então o conteúdo não muda em runtime.
const milestones = parseRoadmap(roadmapMd);
const digest = getDigest(milestones);

export default function Roadmap() {
  const t = useThemeTokens();
  const { milestonesDone, milestonesTotal, current } = digest;

  // A milestone em andamento já abre expandida: é a que a pessoa quer ver ao
  // entrar. As outras ficam a um toque.
  const [abertas, setAbertas] = useState(() => (current ? [current.id] : []));
  const alterna = (id) =>
    setAbertas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
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

        {/* Todas as milestones, na ordem do documento. Antes a tela só mostrava
            a atual, e tudo que já foi entregue ou ainda vem ficava fora de
            alcance (#303). */}
        <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 pt-4 pb-1">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Milestones
          </Text>
          <View className="mt-1">
            {milestones.map((m, i) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                expanded={abertas.includes(m.id)}
                atual={m.id === current?.id}
                ultima={i === milestones.length - 1}
                onToggle={() => alterna(m.id)}
                chevronColor={t.label}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </MyView>
  );
}

// Bolinha de status, compartilhada pela linha da milestone e pelo item.
const DOT = {
  done: "bg-secondary dark:bg-secondary-dark",
  partial: "bg-primary dark:bg-primary-dark",
  todo: "bg-border-strong dark:bg-border-strong-dark",
};

/**
 * Uma milestone do acordeão: cabeçalho tocável e, quando aberta, os itens.
 *
 * O cabeçalho inteiro é UM `Pressable`, e os itens são `View` puras. Aninhar
 * pressable dentro de pressable vira `<button>` dentro de `<button>` no
 * react-native-web, e o React DOM recusa (foi o bug do #281).
 */
function MilestoneRow({
  milestone,
  expanded,
  atual,
  ultima,
  onToggle,
  chevronColor,
}) {
  const total = milestone.items.length;
  const feitos = useMemo(
    () => milestone.items.filter((i) => i.status === "done").length,
    [milestone.items],
  );

  return (
    <View
      className={
        ultima
          ? ""
          : "border-b border-border-subtle dark:border-border-subtle-dark"
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${milestone.id}, ${milestone.title}, ${feitos} de ${total} itens, ${expanded ? "expandido" : "recolhido"}`}
        onPress={onToggle}
        className="flex-row items-center gap-3 py-3.5 active:opacity-70"
      >
        <View className={`h-2.5 w-2.5 rounded-full ${DOT[milestone.status]}`} />
        <Text
          className="flex-1 text-base text-ink dark:text-ink-dark"
          style={{
            fontFamily: atual ? "Inter_600SemiBold" : "Inter_400Regular",
          }}
        >
          {milestone.id} · {milestone.title}
        </Text>
        <Text
          className="text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          {feitos}/{total}
        </Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d={expanded ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"}
            stroke={chevronColor}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      {expanded && total > 0 && (
        <View className="gap-2.5 pb-4 pl-5">
          {milestone.items.map((item, i) => (
            <ItemRow key={i} status={item.status} text={item.text} />
          ))}
        </View>
      )}
    </View>
  );
}

/** @param {{ status: "done" | "partial" | "todo", text: string }} props */
function ItemRow({ status, text }) {
  // Bolinha colorida em vez do emoji: done = accentToday, partial = primary,
  // todo = border-strong (vazio). Mais discreto e alinha melhor com o resto
  // do design v2 (WeekStrip usa a mesma paleta pra status de dia).
  const color = DOT[status];
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
