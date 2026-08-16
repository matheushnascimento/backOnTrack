// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable, useValue } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import InstallApp from "@/components/InstallApp";
import Icon1c from "@/components/Icon1c";
import RetomadaState from "@/components/RetomadaState";
import FocusCard from "@/components/journey/FocusCard";
import RegressionNotice from "@/components/journey/RegressionNotice";
import LevelUpSheet from "@/components/journey/LevelUpSheet";
import CompactRow from "@/components/journey/CompactRow";

import {
  acknowledgeJourneyLevel,
  add,
  getGoals,
  getToday,
  raiseJourneyPeak,
  store,
} from "@/infra/database";
import { useSession } from "@/infra/session";
import { useThemeTokens } from "@/constants/themeTokens";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
import { getGreeting } from "@/constants/greeting";
import { deriveJourney } from "@/constants/journey";
import {
  headerCopy,
  levelChip,
  restBadge,
  splitZones,
} from "@/constants/journeyHome";
import {
  MOMENT_LEVEL_UP,
  MOMENT_REGRESSION,
  levelUpCopy,
  pendingMoment,
  regressionCopy,
} from "@/constants/journeyMoments";
import { JOURNEY_ORDER } from "@/constants/goals";
import { PAUSED } from "@/constants/journey";
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

  // Estado da jornada (#289). O peak vem do store e é o que torna regressão
  // detectável — sem ele não dá pra distinguir "caiu" de "ainda não chegou".
  const peak = useValue("journeyPeakLevel", store);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goals = useMemo(() => getGoals(), [records]);
  const journey = useMemo(
    () =>
      deriveJourney({
        records: Object.values(records ?? {}),
        goals,
        previousLevel: Number(peak) || null,
      }),
    [records, goals, peak],
  );
  // Escrita no store fica em efeito, nunca em render.
  useEffect(() => {
    raiseJourneyPeak(journey.level);
  }, [journey.level]);

  const { focus, rest } = splitZones(journey);
  const copy = headerCopy(journey);

  // Momento pendente (#293). O ack é o que garante "uma vez e some": sem ele
  // o aviso de regressão voltaria em toda abertura.
  const ackLevel = useValue("journeyAckLevel", store);
  const moment = pendingMoment(journey.level, Number(ackLevel ?? -1));
  const pausados = JOURNEY_ORDER.filter(
    (m) => journey.habits[m]?.status === PAUSED,
  );

  function dispensarMomento() {
    acknowledgeJourneyLevel(journey.level);
  }

  // Retomada aparece quando: (a) nunca registrou, ou (b) 3+ dias corridos sem
  // registro em nenhuma métrica. Dismissal in-memory desliga só nesta sessão.
  // Registrar hoje (totalRecords>0) desliga automaticamente pelo critério (a).
  const showRetomada =
    !retomadaDismissed &&
    totalRecords === 0 &&
    (daysSinceLast === null || daysSinceLast >= 3);

  const porMetrica = Object.fromEntries(
    METRICS.map((type) => {
      const { displayName, unit } = CATEGORY_MAP[type];
      const registros = today[type] ?? [];
      const total = registros.reduce(
        (s, r) => s + (Number(r.quantity) || 0),
        0,
      );
      return [
        type,
        {
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          unit,
          count: registros.length,
          total,
          value: registros.length > 0 ? formatValue(unit, total) : null,
        },
      ];
    }),
  );

  // Incremento direto da Home. `date` e `createdAt` saem do buildRow.
  function quickAdd(metric, valor) {
    add(metric, { quantity: valor, unit: CATEGORY_MAP[metric]?.unit ?? "" });
  }

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
          {/* Data + chip de nível. O nível é CONTEXTO, não pontuação — por
              isso vive num chip discreto ao lado da data, e nunca como número
              grande (docs/11-modelo-de-niveis.md §1.5). */}
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className="text-xs tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {formatDateLabel()}
            </Text>
            <View className="rounded-full bg-tint-blue dark:bg-tint-blue-dark px-2 py-0.5">
              <Text
                className="text-xs tracking-wider text-primary dark:text-primary-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                {levelChip(journey.level, focus)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between gap-3">
            {/* `flex-1` dá largura limitada pro Text — sem isso ele não tem
                onde quebrar e o nome longo vaza. Com a largura definida, a
                quebra natural cai no espaço depois da vírgula: "Bom dia," na
                primeira linha, nome na segunda. `numberOfLines={2}` fecha o
                caso extremo (nome que sozinho não cabe numa linha), cortando
                com reticências em vez de empurrar o ícone pra fora. */}
            <Text
              className="flex-1 text-2xl text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
              numberOfLines={2}
              ellipsizeMode="tail"
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
            {copy.title}
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {copy.subtitle}
          </Text>
        </View>

        {/* Aviso de regressão: no topo, acima de tudo. Não é modal de
            propósito — não bloqueia, e a pessoa pode ignorar e registrar. */}
        {moment === MOMENT_REGRESSION ? (
          <RegressionNotice
            copy={regressionCopy({ focus: focus ?? "sleep", paused: pausados })}
            onHistory={() => router.navigate("/history")}
            onDismiss={dispensarMomento}
          />
        ) : null}

        {/* Zona de foco: o hábito do nível, com número grande e ação rápida.
            É o único com essa altura — a hierarquia mora aqui. */}
        {focus ? (
          <FocusCard
            metric={focus}
            name={porMetrica[focus].name}
            value={porMetrica[focus].value ?? "0"}
            unit={
              porMetrica[focus].count > 0 ? undefined : porMetrica[focus].unit
            }
            count={porMetrica[focus].count}
            onQuickAdd={(v) => quickAdd(focus, v)}
            onOpen={() => router.navigate(`/(metrics)/${focus}`)}
          />
        ) : null}

        {/* Zona "resto do dia": tudo o mais, compacto mas tapável. NADA some —
            é a decisão central do design (hierarquia, não exclusão). */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              resto do dia
            </Text>
            <View className="h-px flex-1 bg-border-subtle dark:bg-border-subtle-dark" />
          </View>
          {rest.map((metric) => (
            <CompactRow
              key={metric}
              metric={metric}
              name={porMetrica[metric].name}
              value={porMetrica[metric].value}
              badge={restBadge(journey.habits[metric]?.status)}
              onPress={() => router.navigate(`/(metrics)/${metric}`)}
            />
          ))}
          <Text
            className="px-1 text-xs text-label dark:text-label-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            Tudo continua registrável. A ordem é sugerida.
          </Text>
        </View>

        {/* Obter o app (só web: QR no desktop, download no celular) */}
        <InstallApp />

        {/* Login/logout ficam TODOS em Ajustes → Conta (Entrar quando !user,
            Sair quando user). Ter um botão Entrar aqui na Home também era
            redundante — e como useSession pode devolver `user: null` durante
            o auto-load da sessão, o gate `!user` piscava o botão logo depois
            de logar. Concentrar em Ajustes elimina o flicker e centraliza. */}
      </ScrollView>

      {/* Subir de nível: bottom sheet, fora do ScrollView. Fullscreen trataria
          a subida como interrupção solene; sheet trata como recado. */}
      {moment === MOMENT_LEVEL_UP && focus ? (
        <LevelUpSheet
          visible
          copy={levelUpCopy({
            from: Number(ackLevel ?? 0),
            to: journey.level,
            achieved: JOURNEY_ORDER[Math.max(0, journey.level - 2)],
            next: focus,
          })}
          achieved={JOURNEY_ORDER[Math.max(0, journey.level - 2)]}
          next={focus}
          onDismiss={dispensarMomento}
          onConfirm={() => {
            dispensarMomento();
            router.navigate(`/(metrics)/${focus}`);
          }}
        />
      ) : null}
    </MyView>
  );
}
