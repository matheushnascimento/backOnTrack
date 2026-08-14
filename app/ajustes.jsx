// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
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
import { useValue } from "tinybase/ui-react";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";

import { clearAll, setDisplayName, store } from "@/infra/database";
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
import { getEnvironmentInfo } from "@/constants/environment";
import { useThemeTokens } from "@/constants/themeTokens";

const ENV = getEnvironmentInfo();

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

// Metas hardcoded (mesmos defaults do registry). Cada valor vai ganhar edição
// quando "metas por-usuário" virar tarefa própria.
const METAS = [
  { key: "water", label: "Água", value: "2,0 L" },
  { key: "sleep", label: "Sono", value: "8h" },
  { key: "exercise", label: "Exercício", value: "30 min" },
  { key: "feeding", label: "Alimentação", value: "3 refeições" },
  { key: "study", label: "Estudo", value: "30 min" },
];

export default function Ajustes() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { user, signOut } = useSession();
  const isDark = colorScheme === "dark";
  const t = useThemeTokens();

  const displayName = useValue("displayName", store);
  const [nameModalOpen, setNameModalOpen] = useState(false);

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
          {METAS.map((m) => (
            <Row
              key={m.key}
              label={m.label}
              value={m.value}
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

        {/* Avançado */}
        <Section title="Avançado">
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
