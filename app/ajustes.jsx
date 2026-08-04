// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import Svg, { Path } from "react-native-svg";

import MyView from "@/components/MyView";

import { clearAll } from "@/infra/database";
import { useSession } from "@/infra/session";
import { AUTH_ENABLED } from "@/infra/supabase";
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
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { user, signOut } = useSession();
  const isDark = colorScheme === "dark";
  const t = useThemeTokens();

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
            onPress={() => router.back()}
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
          {/* Tema com switch inline (mesmo controle do MenuModal antigo) */}
          <View className="flex-row items-center justify-between border-t border-surface-subtle px-4 py-3">
            <Text
              className="text-sm text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Tema escuro
            </Text>
            <Switch
              value={isDark}
              onValueChange={() => toggleColorScheme()}
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
    </MyView>
  );
}

/** @param {{ title: string, children: any }} props */
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
      className={`flex-row items-center justify-between border-t border-surface-subtle px-4 py-3 ${
        onPress && !disabled ? "active:opacity-70" : ""
      }`}
    >
      <Text
        className={`text-sm ${destructive ? "text-danger dark:text-danger" : "text-ink dark:text-ink-dark"}`}
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
      <View className="flex-row items-center gap-1">
        {value ? (
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
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
