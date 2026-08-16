// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import Svg, { Path } from "react-native-svg";
import { useTable, useValue } from "tinybase/ui-react";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";
import SkipLevelSheet from "@/components/journey/SkipLevelSheet";

import {
  clearAll,
  getGoals,
  acknowledgeJourneyLevel,
  getGrantedHabits,
  grantHabit,
  raiseJourneyPeak,
  setJourneyDemoLevel,
  setDisplayName,
  store,
} from "@/infra/database";
import { useSession } from "@/infra/session";
import { AUTH_ENABLED } from "@/infra/supabase";
import {
  SYNC_CONNECTING,
  SYNC_NEEDS_AUTH,
  SYNC_OFF,
  SYNC_OFFLINE,
  SYNC_ONLINE,
  useSyncStatus,
} from "@/infra/sync";
import { saveThemePreference } from "@/infra/theme";
import { confirmAction } from "@/constants/dialogs";
import { getEnvironmentInfo, isDevSurface } from "@/constants/environment";
import { useThemeTokens } from "@/constants/themeTokens";
import { JOURNEY_ORDER, formatGoal, goalFor } from "@/constants/goals";
import { habitSignals } from "@/constants/habitSignals";
import { skipCopy, skipEvidence, skipQualifies } from "@/constants/journeySkip";
import {
  BUILDING,
  GRADUATED,
  LOCKED,
  PAUSED,
  deriveJourney,
} from "@/constants/journey";

const ENV = getEnvironmentInfo();
// Ferramenta de dev não vai pro app dos testers. Ver isDevSurface.
const DEV_SURFACE = isDevSurface();

// Tela Ajustes (M5-B fatia 4, mockup 2a·8).
//
// Substitui o `MenuModal` como hub de navegação. O hamburger da Home passa a
// navegar direto pra cá em vez de abrir modal. Modal ficou pequeno pro que a
// nav do design v2 precisa (metas do dia + seções organizadas), e um modal
// full-height + rolagem lê pior que uma tela dedicada.
//
// Seções:
//   - METAS DO DIA  — display-only por ora (valor por-usuário é feature futura).
//   - NAVEGAÇÃO     — Semana / Histórico.
//   - APP           — Tema switch inline, Feedback, Roadmap, Exportar, Sobre.
//   - CONTA         — só se logado (Logado como… + Sair).
//   - AVANÇADO      — Limpar todos os dados (destrutivo, confirm modal).
//
// Lembretes da mockup ficaram fora (dependem de expo-notifications, escopo M7).

// Rótulos das metas. Os VALORES vêm do store desde a #285 — antes eram texto
// fixo aqui, e o modelo de níveis não fecha sem meta como dado. Edição pelo
// usuário é fatia própria; por ora o store guarda os mesmos defaults.
const METAS_LABEL = {
  water: "Água",
  sleep: "Sono",
  exercise: "Exercício",
  feeding: "Alimentação",
  study: "Estudo",
};

// Rótulo humano dos status da jornada. Descritivo, nunca elogioso — é
// diagnóstico, não reforço (docs/11-modelo-de-niveis.md §1.5).
const STATUS_LABEL = {
  [BUILDING]: "construindo",
  [GRADUATED]: "estável",
  [PAUSED]: "em pausa",
  [LOCKED]: "—",
};

// Janela dos sinais de automaticidade. 28 dias é a janela do portão de nível
// (docs/11-modelo-de-niveis.md §5).
const JANELA_SINAIS = 28;

export default function Ajustes() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { user, signOut } = useSession();
  const isDark = colorScheme === "dark";
  const t = useThemeTokens();

  const displayName = useValue("displayName", store);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  // `useTable` assina a tabela: metas semeadas depois do load do persister
  // chegam sozinhas, sem precisar reabrir a tela.
  const goalsTable = useTable("goals", store);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goals = useMemo(() => getGoals(), [goalsTable]);

  // Pular nível (#295): a pessoa declara que já tem o hábito, o app confere o
  // histórico com o MESMO critério do portão e concede — ou diz que observa.
  const [skipMetric, setSkipMetric] = useState(null);
  const recordsTable = useTable("records", store);
  const grantedValue = useValue("journeyGranted", store);
  const skipInfo = useMemo(() => {
    if (!skipMetric) return null;
    const lista = Object.values(recordsTable ?? {});
    const signals = habitSignals(
      lista,
      skipMetric,
      goalFor(goals, skipMetric),
      JANELA_SINAIS,
    );
    const qualifies = skipQualifies(signals);
    const jornadaAtual = deriveJourney({
      records: lista,
      goals,
      granted: getGrantedHabits(),
    });
    return {
      signals,
      qualifies,
      evidence: skipEvidence(signals, JANELA_SINAIS),
      copy: skipCopy({
        metric: skipMetric,
        qualifies,
        nextLevel: jornadaAtual.level + 1,
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipMetric, recordsTable, goals, grantedValue]);

  function handleClear() {
    confirmAction({
      title: "Limpar todos os dados",
      message: "Isso apaga todos os registros. Tem certeza?",
      confirmLabel: "Limpar",
      onConfirm: clearAll,
    });
  }

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
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Ajustes
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            Metas gentis. Pode mudar a qualquer hora.
          </Text>
        </View>

        {/* Metas do dia (display-only por ora) */}
        <Section title="Metas do dia">
          {JOURNEY_ORDER.map((metric) => (
            <Row
              key={metric}
              label={METAS_LABEL[metric]}
              value={formatGoal(metric, goalFor(goals, metric))}
              valueMono
              disabled
            />
          ))}
        </Section>

        {/* Navegação */}
        <Section title="Navegação">
          <Row
            label="Semana"
            valueChevron
            onPress={() => router.navigate("/semana")}
          />
          <Row
            label="Histórico"
            valueChevron
            onPress={() => router.navigate("/history")}
          />
        </Section>

        {/* App */}
        <Section title="App">
          {/* Nome preferido pra saudação da Home. Se vazio, a Home cai no
              primeiro nome do email do usuário logado. */}
          <Row
            label="Como quer ser chamado"
            value={displayName || "definir"}
            valueChevron
            onPress={() => setNameModalOpen(true)}
          />
          {/* Tema com switch inline. Usa `setColorScheme` com o valor que o
              Switch entrega, não `toggleColorScheme()`: quando o usuário
              ainda não escolheu, o colorScheme pode vir indefinido e o
              "flip a partir do atual" fica ambíguo. E persiste a escolha —
              sem isso o tema voltava pro sistema a cada reload. */}
          <View className="flex-row items-center justify-between border-t border-surface-subtle px-4 py-3">
            <Text
              className="text-sm text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Tema escuro
            </Text>
            <Switch
              value={isDark}
              onValueChange={(next) => {
                const scheme = next ? "dark" : "light";
                setColorScheme(scheme);
                saveThemePreference(scheme);
              }}
              accessibilityLabel="Alternar tema escuro"
            />
          </View>
          <Row
            label="Enviar feedback"
            valueChevron
            onPress={() => router.navigate("/feedback")}
          />
          <Row
            label="Roadmap do projeto"
            valueChevron
            onPress={() => router.navigate("/roadmap")}
          />
          <Row
            label="Exportar dados"
            valueChevron
            onPress={() => router.navigate("/export")}
          />
          <SyncRow />
          <Row label="Sobre" value={`v${ENV.appVersion}`} valueMono disabled />
        </Section>

        {/* Conta: sempre visível quando auth tá configurada. Concentra o
            fluxo de entrar/sair — a Home não tem mais botão Entrar isolado
            (era redundante e piscava durante o auto-load da sessão). */}
        {AUTH_ENABLED && (
          <Section title="Conta">
            {user ? (
              <>
                <Row label="Logado como" value={user.email} disabled />
                <Row label="Sair" onPress={signOut} destructive />
              </>
            ) : (
              <Row
                label="Entrar"
                valueChevron
                onPress={() => router.navigate("/login")}
              />
            )}
          </Section>
        )}

        {/* Já tenho esse hábito — pular nível com conferência (#295). */}
        <Section title="Já tenho esse hábito">
          {JOURNEY_ORDER.map((metric) => (
            <Row
              key={metric}
              label={METAS_LABEL[metric]}
              value={
                getGrantedHabits().includes(metric) ? "estável" : "conferir"
              }
              valueChevron={!getGrantedHabits().includes(metric)}
              disabled={getGrantedHabits().includes(metric)}
              onPress={
                getGrantedHabits().includes(metric)
                  ? undefined
                  : () => setSkipMetric(metric)
              }
            />
          ))}
        </Section>

        {/* Avançado */}
        <Section title="Avançado">
          <SignalsBlock goals={goals} />
          <Row
            label="Limpar todos os dados"
            onPress={handleClear}
            destructive
          />
        </Section>

        {/* Tagline */}
        <Text
          className="mt-2 text-center text-xs text-icon-dim dark:text-icon-dim-dark"
          style={{ fontFamily: "Inter_400Regular", fontStyle: "italic" }}
        >
          Back on Track · de volta aos trilhos, um registro por vez.
        </Text>

        {/* Bundle info discreto (mantém diagnóstico do tester) */}
        {ENV.bundle ? (
          <Text
            className="text-center text-xs text-icon-dim dark:text-icon-dim-dark"
            style={{ fontFamily: "JetBrainsMono_400Regular" }}
          >
            {ENV.bundle}
          </Text>
        ) : null}
      </ScrollView>

      {skipInfo ? (
        <SkipLevelSheet
          visible
          metric={skipMetric}
          copy={skipInfo.copy}
          evidence={skipInfo.evidence}
          qualifies={skipInfo.qualifies}
          onDismiss={() => setSkipMetric(null)}
          onConfirm={() => {
            grantHabit(skipMetric);
            setSkipMetric(null);
          }}
        />
      ) : null}

      {nameModalOpen && (
        <NameEditModal
          current={displayName || ""}
          onClose={() => setNameModalOpen(false)}
        />
      )}
    </MyView>
  );
}

/** @param {{ current: string, onClose: () => void }} props */
function NameEditModal({ current, onClose }) {
  const t = useThemeTokens();
  const [value, setValue] = useState(current);

  function handleSave() {
    setDisplayName(value);
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          padding: 16,
        }}
        onPress={onClose}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 20,
            padding: 20,
            gap: 14,
            maxWidth: 360,
            width: "100%",
          }}
        >
          <Text
            style={{
              color: t.ink,
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
            }}
          >
            Como quer ser chamado?
          </Text>
          <Text
            style={{
              color: t.bodySecondary,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: -4,
            }}
          >
            Aparece na saudação da Home. Deixar em branco volta ao primeiro nome
            do email.
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ana"
            placeholderTextColor={t.iconDim}
            autoFocus
            maxLength={40}
            accessibilityLabel="Nome preferido"
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 20,
              color: t.ink,
              borderBottomWidth: 1,
              borderBottomColor: t.borderSubtle,
              paddingVertical: 6,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: t.bodySecondary,
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                }}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Salvar"
              onPress={handleSave}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: t.primary,
              }}
            >
              <Text
                style={{
                  color: t.onPrimary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

/** @param {{ title: string, children: any }} props */
// Estado do sync, em linguagem de gente. Fecha o item "UI de status de sync"
// do M6: o auto-reconnect (#263) resolveu a queda silenciosa, mas o usuário
// ainda não tinha ONDE conferir se estava sincronizando — e a quebra do ES256
// mostrou que "não aparece no outro aparelho" pode passar semanas invisível.
//
// Estar offline NÃO é erro aqui: o app é local-first, os registros ficam
// salvos no aparelho e sobem quando a conexão volta. Por isso nada de
// vermelho — o `danger` fica reservado pro destrutivo (regra 2 do Turno 3).
// Offline usa cinza de label e a copy tranquiliza em vez de cobrar.
const SYNC_UI = {
  [SYNC_ONLINE]: {
    dot: "bg-secondary dark:bg-secondary-dark",
    text: "em dia",
    hint: null,
  },
  [SYNC_CONNECTING]: {
    dot: "bg-primary dark:bg-primary-dark",
    text: "conectando…",
    hint: null,
  },
  [SYNC_OFFLINE]: {
    dot: "bg-border-strong dark:bg-border-strong-dark",
    text: "sem conexão",
    hint: "Seus registros ficam salvos aqui e sobem quando voltar.",
  },
  [SYNC_OFF]: {
    dot: "bg-border-strong dark:bg-border-strong-dark",
    text: "desligado",
    hint: null,
  },
  // Recusado por falta de login (#278). Antes isto caía em `offline`, e as
  // três coisas ficavam falsas ao mesmo tempo: não era falta de conexão, nada
  // ia "subir quando voltar", e o "Tentar de novo" nunca funcionaria. Copy
  // sem cobrança, como o resto — o registro local segue intacto.
  [SYNC_NEEDS_AUTH]: {
    dot: "bg-border-strong dark:bg-border-strong-dark",
    text: "precisa entrar",
    hint: "Seus registros estão salvos aqui. Entre para guardá-los também na sua conta.",
  },
};

function SyncRow() {
  const { status, reconnect } = useSyncStatus();
  const ui = SYNC_UI[status] ?? SYNC_UI[SYNC_OFF];
  // Só oferece "tentar de novo" quando há o que retentar. Em `off` não há
  // servidor configurado; em `connecting`/`online` já está acontecendo; em
  // `needs-auth` retentar é justamente o que não resolve — a ação é entrar.
  const canRetry = status === SYNC_OFFLINE;
  const precisaEntrar = status === SYNC_NEEDS_AUTH;

  return (
    <View className="gap-1 border-t border-surface-subtle dark:border-surface-subtle-dark px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-sm text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Sincronização
        </Text>
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-full ${ui.dot}`} />
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {ui.text}
          </Text>
        </View>
      </View>
      {ui.hint ? (
        <Text
          className="text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {ui.hint}
        </Text>
      ) : null}
      {canRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar sincronizar de novo"
          onPress={reconnect}
          className="mt-1 self-start rounded-xl bg-surface-subtle dark:bg-surface-subtle-dark px-3 py-1.5 active:opacity-70"
        >
          <Text
            className="text-xs text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Tentar de novo
          </Text>
        </Pressable>
      ) : null}
      {precisaEntrar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entrar para sincronizar"
          onPress={() => router.navigate("/login")}
          className="mt-1 self-start rounded-xl bg-surface-subtle dark:bg-surface-subtle-dark px-3 py-1.5 active:opacity-70"
        >
          <Text
            className="text-xs text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Entrar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Sinais de automaticidade por métrica (#285, fatia 0).
 *
 * Medição silenciosa: nada aqui decide nada. Nenhum limiar, nenhum nível,
 * nenhum "bom/ruim" — só os números crus, pra calibrar os limiares do modelo
 * com dado real antes de pendurar consequência neles
 * (docs/11-modelo-de-niveis.md §12).
 *
 * Por isso o tom é deliberadamente frio: sem cor de sucesso, sem barra de
 * progresso, sem emoji. Se isto parecer placar, vira a gamificação que o
 * projeto rejeitou.
 */
function SignalsBlock({ goals }) {
  const records = useTable("records", store);
  const peak = useValue("journeyPeakLevel", store);
  const demo = Number(useValue("journeyDemoLevel", store) ?? -1);
  const emDemo = demo >= 0;

  const jornada = useMemo(
    () =>
      deriveJourney({
        records: Object.values(records ?? {}),
        goals,
        previousLevel: Number(peak) || null,
      }),
    [records, goals, peak],
  );

  // Escrita no store vive em efeito, nunca em render.
  useEffect(() => {
    raiseJourneyPeak(jornada.level);
  }, [jornada.level]);

  const linhas = useMemo(() => {
    const lista = Object.values(records ?? {});
    return JOURNEY_ORDER.map((metric) => {
      const s = habitSignals(
        lista,
        metric,
        goalFor(goals, metric),
        JANELA_SINAIS,
      );
      const consist = `${Math.round(s.consistency.rate * 100)}%`;
      const sd = s.regularity.sdMinutes;
      // n<2 não produz desvio: dizer "0 min" seria afirmar regularidade
      // perfeita sem amostra. "—" é a resposta honesta.
      const regul = sd == null ? "—" : `±${Math.round(sd)}min`;
      const res =
        s.resilience.rate == null
          ? "—"
          : `${Math.round(s.resilience.rate * 100)}%`;
      return {
        metric,
        consist,
        regul,
        res,
        status: STATUS_LABEL[jornada.habits[metric]?.status] ?? "—",
      };
    });
  }, [records, goals, jornada]);

  return (
    <View className="border-t border-surface-subtle dark:border-surface-subtle-dark px-4 py-3">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        Sinais · {JANELA_SINAIS} dias
      </Text>
      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular", marginTop: 4 }}
      >
        Medição em andamento. Ainda não decide nada.
      </Text>
      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "JetBrainsMono_400Regular", marginTop: 6 }}
      >
        nível derivado: {jornada.level}
        {jornada.focus ? ` · foco: ${METAS_LABEL[jornada.focus]}` : ""}
        {jornada.regressed ? ` · abaixo do pico (${peak})` : ""}
      </Text>

      <View className="mt-3 flex-row">
        <Text
          className="flex-1 text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          {" "}
        </Text>
        {["consist.", "horário", "volta", "estado"].map((h) => (
          <Text
            key={h}
            className="w-14 text-right text-xs text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_400Regular" }}
          >
            {h}
          </Text>
        ))}
      </View>

      {/* Controles de desenvolvimento — NÃO aparecem no app dos testers.
          Ver `isDevSurface`: só em dev e no canal `staging`. */}
      {DEV_SURFACE ? (
        <>
          {/* Previsualização de nível: força o nível pra ver as telas que o
          histórico curto não alcança. Afrouxar limiar não resolveria — com
          21% de consistência o portão teria que cair tão fundo que deixaria
          de ser o mesmo portão. Isto testa a TELA; o modelo continua coberto
          por tests/journey.test.js com dado sintético. */}
          <View className="mt-3 flex-row items-center gap-2">
            <Text
              className="flex-1 text-xs text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              {emDemo ? `demo: lvl ${demo}` : "previsualizar nível"}
            </Text>
            {[2, 3].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`Previsualizar nível ${n}`}
                onPress={() => {
                  setJourneyDemoLevel(n, jornada.level);
                  // ack um abaixo → a Home dispara o sheet de subida.
                  acknowledgeJourneyLevel(n - 1);
                }}
                className="rounded-lg border border-border-subtle dark:border-border-subtle-dark px-3 py-1.5 active:opacity-70"
              >
                <Text
                  className="text-xs text-body-secondary dark:text-body-secondary-dark"
                  style={{ fontFamily: "JetBrainsMono_400Regular" }}
                >
                  lvl {n}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair da previsualização"
              onPress={() => setJourneyDemoLevel(-1, jornada.level)}
              className="rounded-lg border border-border-subtle dark:border-border-subtle-dark px-3 py-1.5 active:opacity-70"
            >
              <Text
                className="text-xs text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "JetBrainsMono_400Regular" }}
              >
                sair
              </Text>
            </Pressable>
          </View>

          {/* Controles de simulação (#293).
          Os dois momentos são inobserváveis com histórico curto: nada sobe,
          nada cai. Estes botões só mexem no `journeyAckLevel` — o nível que a
          pessoa "já viu" — pra forçar a comparação a dar subida ou queda.
          Nenhum registro é tocado, e dispensar o momento devolve o ack ao
          nível real. É o equivalente ao server em `required` que usamos pra
          ver o estado de "precisa entrar". */}
          <View className="mt-3 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Simular subida de nível"
              onPress={() => acknowledgeJourneyLevel(jornada.level - 1)}
              className="flex-1 rounded-xl border border-border-subtle dark:border-border-subtle-dark py-2 active:opacity-70"
            >
              <Text
                className="text-center text-xs text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "JetBrainsMono_400Regular" }}
              >
                simular subida
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Simular regressão"
              onPress={() => acknowledgeJourneyLevel(jornada.level + 2)}
              className="flex-1 rounded-xl border border-border-subtle dark:border-border-subtle-dark py-2 active:opacity-70"
            >
              <Text
                className="text-center text-xs text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "JetBrainsMono_400Regular" }}
              >
                simular regressão
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {linhas.map((l) => (
        <View key={l.metric} className="mt-1.5 flex-row">
          <Text
            className="flex-1 text-sm text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {METAS_LABEL[l.metric]}
          </Text>
          {[l.consist, l.regul, l.res, l.status].map((v, i) => (
            <Text
              key={i}
              className="w-14 text-right text-xs text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark">
      <Text
        className="px-4 pt-3.5 pb-1.5 text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * @param {{
 *   label: string,
 *   value?: string,
 *   valueMono?: boolean,
 *   valueChevron?: boolean,
 *   onPress?: () => void,
 *   disabled?: boolean,
 *   destructive?: boolean,
 *  ?: boolean,
 * }} props
 */
function Row({
  label,
  value,
  valueMono,
  valueChevron,
  onPress,
  disabled,
  destructive,
}) {
  const Wrap = onPress && !disabled ? Pressable : View;
  return (
    <Wrap
      {...(onPress && !disabled
        ? {
            onPress,
            accessibilityRole: "button",
            accessibilityLabel: label,
          }
        : {})}
      className={`flex-row items-center justify-between gap-3 border-t border-surface-subtle px-4 py-3 ${
        onPress && !disabled ? "active:opacity-70" : ""
      }`}
    >
      {/* Sem flex/shrink explícito, RN não encolhe ninguém por padrão (ao
          contrário do CSS web) — label + value longos (ex: "Logado como" +
          email, ou o nome customizado do usuário) podiam somar mais que a
          largura da row e cortar sem reticências no Android. `label` fica no
          tamanho natural (são strings curtas e fixas do app); `value` é o
          lado que recebe conteúdo do usuário, então é ele que ganha o
          container flex-1 + Text com shrink pra ellipsize de verdade. */}
      <Text
        className={`text-sm ${destructive ? "text-danger dark:text-danger" : "text-ink dark:text-ink-dark"}`}
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
      <View className="flex-1 flex-row items-center justify-end gap-1">
        {value ? (
          <Text
            className="shrink text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{
              fontFamily: valueMono
                ? "JetBrainsMono_400Regular"
                : "Inter_400Regular",
            }}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {valueChevron || (onPress && !disabled && !destructive) ? (
          <Text
            className="text-sm text-label dark:text-label-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            ›
          </Text>
        ) : null}
      </View>
    </Wrap>
  );
}
