// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable, useValue } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import InstallApp from "@/components/InstallApp";
import MetricCard from "@/components/MetricCard";
import Icon1c from "@/components/Icon1c";
import RetomadaState from "@/components/RetomadaState";

import { getToday, store } from "@/infra/database";
import { useSession } from "@/infra/session";
import { useThemeTokens } from "@/constants/themeTokens";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
//#endregion

const METRICS = Object.keys(CATEGORY_MAP);

// Formata o total do dia por unidade. Migração v2: usa vírgula pra ml (padrão pt-BR)
// e HH:MM pra minutos. Pluraliza refeição.
function formatValue(unit, total) {
  if (unit === "min") return minutesToHHMM(total);
  if (unit === "refeição")
    return `${total} ${total === 1 ? "refeição" : "refeições"}`;
  if (unit === "ml") return `${total.toLocaleString("pt-BR")} ml`;
  return `${total} ${unit}`;
}

// Saudação por horário. Design v2 usa "Bom dia, Ana." — o nome vem do
// `displayName` que o usuário definiu em Ajustes; se não houver, cai no
// primeiro nome do email (localpart até o primeiro `.`, pra que
// "matheus.mhddn@gmail.com" vire "Matheus" e não "Matheus.mhddn"). Deslogado
// sem displayName usa só o cumprimento.
function getGreeting(user, displayName) {
  const h = new Date().getHours();
  const g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const name = pickName(user, displayName);
  if (!name) return `${g}.`;
  return `${g}, ${name}.`;
}

function pickName(user, displayName) {
  const stored = String(displayName ?? "").trim();
  if (stored) return stored;
  const email = user?.email;
  if (!email) return "";
  const localpart = String(email).split("@")[0] || "";
  const first = localpart.split(".")[0] || "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Dias corridos desde o último registro em qualquer métrica. Null se o store
// nunca teve registro (usuário novo). Usado pra decidir entre Home normal e
// estado de retomada da fatia 5.
function computeDaysSinceLast(records) {
  let maxCreatedAt = 0;
  for (const row of Object.values(records)) {
    const c = Number(row?.createdAt) || 0;
    if (c > maxCreatedAt) maxCreatedAt = c;
  }
  if (maxCreatedAt === 0) return null;
  const now = new Date();
  const last = new Date(maxCreatedAt);
  // Compara dias-de-calendário local, não 24h corridas — pra "faz 1 dia" só
  // acontecer na virada do dia, não 24h depois do registro.
  const todayMid = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const lastMid = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate(),
  ).getTime();
  return Math.max(0, Math.round((todayMid - lastMid) / 86_400_000));
}

// Data no formato "SEGUNDA · 12 AGO" (pt-BR, uppercase). Usada como label
// discreto acima do greeting.
function formatDateLabel() {
  const d = new Date();
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = d.getDate();
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${weekday} · ${day} ${month}`.toUpperCase();
}

export default function Home() {
  const { user } = useSession();
  const t = useThemeTokens();
  // Dismissal in-memory do estado de retomada (M5-B fatia 5). Persistir viraria
  // sub-tarefa; hoje "Depois" dura só a sessão — próximo launch com o critério
  // ainda válido volta a mostrar, que é o objetivo (convidar até registrar).
  const [retomadaDismissed, setRetomadaDismissed] = useState(false);

  // Assina a tabela: `useTable` re-renderiza a cada mudança nos registros —
  // inclusive quando o `startAutoLoad()` da persistência termina de carregar.
  // Ler só no foco (o padrão anterior) perdia essa carga: no primeiro load a
  // tela lia a store ainda vazia e nunca era avisada quando os dados chegavam,
  // então a Home só mostrava algo depois de ir a outra tela e voltar (#108).
  const records = useTable("records", store);
  const displayName = useValue("displayName", store);
  // `records` é gatilho de propósito: muda quando a tabela muda (inclui o fim do
  // autoLoad) e força o getToday a reler. O exhaustive-deps não vê que os dois
  // olham os mesmos dados e sugere remover — o que reintroduziria o #108.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => getToday(), [records]);
  const daysSinceLast = useMemo(() => computeDaysSinceLast(records), [records]);

  const totalRecords = METRICS.reduce((s, m) => s + (today[m]?.length ?? 0), 0);

  // Retomada aparece quando: (a) nunca registrou, ou (b) 3+ dias corridos sem
  // registro em nenhuma métrica. Dismissal in-memory desliga só nesta sessão.
  // Registrar hoje (totalRecords>0) desliga automaticamente pelo critério (a).
  const showRetomada =
    !retomadaDismissed &&
    totalRecords === 0 &&
    (daysSinceLast === null || daysSinceLast >= 3);

  const cards = METRICS.map((type) => {
    const { displayName, unit } = CATEGORY_MAP[type];
    const registros = today[type] ?? [];
    const total = registros.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const active = registros.length > 0;
    return {
      key: type,
      metric: type,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      active,
      value: active ? formatValue(unit, total) : null,
      detail:
        active && registros.length > 1 ? `${registros.length} registros` : null,
    };
  });

  if (showRetomada) {
    return (
      <MyView
        safe={true}
        className="flex-1 bg-light-background dark:bg-app-dark"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hamburger disponível também aqui pra não trancar acesso ao
              Ajustes (ex: sair, exportar) quando o usuário está em retomada. */}
          <View className="w-full flex-row justify-start px-3 pt-2">
            <Pressable
              accessibilityLabel="Abrir ajustes"
              accessibilityRole="button"
              onPress={() => router.navigate("/ajustes")}
              className="rounded-full p-2"
            >
              <Text className="text-2xl text-light-text dark:text-dark-text">
                ☰
              </Text>
            </Pressable>
          </View>
          <RetomadaState
            daysSinceLast={daysSinceLast}
            onDismiss={() => setRetomadaDismissed(true)}
          />
        </ScrollView>
      </MyView>
    );
  }

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Trigger de Ajustes — hamburger à esquerda navega pra tela dedicada
            (M5-B fatia 4). Substituiu o MenuModal antigo. */}
        <View className="w-full flex-row justify-start">
          <Pressable
            accessibilityLabel="Abrir ajustes"
            accessibilityRole="button"
            onPress={() => router.navigate("/ajustes")}
            className="rounded-full p-2"
          >
            <Text className="text-2xl text-light-text dark:text-dark-text">
              ☰
            </Text>
          </Pressable>
        </View>

        {/* Header: data · greeting · mini-ícone 1c · subtitle. Padrão da mockup
            2a·1 do design v2. */}
        <View className="gap-1 px-1">
          <Text
            className="text-xs tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            {formatDateLabel()}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-2xl text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {getGreeting(user, displayName)}
            </Text>
            <View
              className="items-center justify-center rounded-lg bg-primary dark:bg-primary-dark"
              style={{ width: 32, height: 32 }}
            >
              <Icon1c
                size={22}
                strokeColor={t.onPrimary}
                dotColor={t.accentToday}
              />
            </View>
          </View>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            {totalRecords === 0
              ? "Nenhum registro hoje ainda. Sem pressa."
              : `${totalRecords} ${totalRecords === 1 ? "registro" : "registros"} hoje. Sem pressa.`}
          </Text>
        </View>

        {/* 5 metric cards — toque navega pro registro rápido. */}
        <View className="gap-2.5">
          {cards.map((c) => (
            <MetricCard
              key={c.key}
              metric={c.metric}
              name={c.name}
              active={c.active}
              value={c.value}
              detail={c.detail}
              onPress={() => router.navigate(`/(metrics)/${c.metric}`)}
            />
          ))}
        </View>

        {/* Obter o app (só web: QR no desktop, download no celular) */}
        <InstallApp />

        {/* Login/logout ficam TODOS em Ajustes → Conta (Entrar quando !user,
            Sair quando user). Ter um botão Entrar aqui na Home também era
            redundante — e como useSession pode devolver `user: null` durante
            o auto-load da sessão, o gate `!user` piscava o botão logo depois
            de logar. Concentrar em Ajustes elimina o flicker e centraliza. */}
      </ScrollView>
    </MyView>
  );
}
