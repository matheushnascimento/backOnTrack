// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import Icon1c from "./Icon1c";
import MetricIcon from "./MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";

// Estado "retomada" da Home (M5-B fatia 5, mockup 2a·9).
//
// Aparece quando a Home ia mostrar 5 cards vazios: usuário sem registro há N
// dias (ou nunca). Substitui a Home inteira por um convite calmo — símbolo
// grande, copy sem cobrança, 3 atalhos pra métricas mais fáceis. Tom canônico
// do design v2: "Sem pressa", "quando puder", "que bom te ver de volta".
//
// Dismissal é in-memory (via prop `onDismiss`): sessão atual passa a mostrar a
// Home normal. Próximo launch volta pra cá se o critério persistir — é o
// desejado (o objetivo é convidar até a pessoa registrar, não esconder pra
// sempre).

/**
 * @param {{
 *   daysSinceLast: number | null,  // null = nunca registrou
 *   onDismiss: () => void,
 * }} props
 */
export default function RetomadaState({ daysSinceLast, onDismiss }) {
  const t = useThemeTokens();
  const isFirstTime = daysSinceLast === null;

  const title = isFirstTime ? "Bem-vindo." : "Que bom te ver de volta.";
  const subtitle = isFirstTime
    ? "Sem pressa. O primeiro registro pode ser qualquer coisa — comece pelo mais fácil."
    : `Faz ${daysSinceLast} ${daysSinceLast === 1 ? "dia" : "dias"} que nada foi registrado. Sem cobrança — o que importa é o próximo registro.`;

  return (
    <View className="flex-1 gap-6 p-6">
      {/* Símbolo grande — mesmo brand-blue tinted container do resto do app */}
      <View
        className="items-center justify-center rounded-2xl bg-primary dark:bg-primary-dark"
        style={{ width: 84, height: 84 }}
      >
        <Icon1c size={56} strokeColor={t.onPrimary} dotColor={t.accentToday} />
      </View>

      {/* Copy */}
      <View className="gap-3">
        <Text
          className="text-ink dark:text-ink-dark"
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 26,
            lineHeight: 32,
          }}
        >
          {title}
        </Text>
        <Text
          className="text-body-secondary dark:text-body-secondary-dark"
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {subtitle}
        </Text>
      </View>

      {/* Card com os 3 atalhos */}
      <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Quer começar por
        </Text>
        <View className="gap-2.5">
          <ShortcutButton
            metric="water"
            label="Um copo d'água"
            onPress={() => router.navigate("/(metrics)/water")}
          />
          <ShortcutButton
            metric="sleep"
            label="Como foi a última noite"
            onPress={() => router.navigate("/(metrics)/sleep")}
          />
          <ShortcutButton
            label="Ver todas as métricas"
            dim
            onPress={onDismiss}
          />
        </View>
      </View>

      {/* Link "Depois".
          O texto centraliza por `text-center`, NÃO por `items-center` no
          container. Parece a mesma coisa e não é: `alignItems: center` faz o
          filho encolher pra própria largura, e aí quem decide o tamanho da
          caixa é a medição de texto do Android — que erra com a Inter e come
          a última letra ("Depoi"). Com o Text ocupando a largura do pai, a
          caixa vem do layout e a medição não decide nada. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Depois"
        onPress={onDismiss}
        className="p-4 active:opacity-70"
      >
        <Text
          className="text-center text-sm text-label dark:text-label-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Depois
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * @param {{ metric?: string, label: string, dim?: boolean, onPress: () => void }} props
 */
function ShortcutButton({ metric, label, dim, onPress }) {
  const t = useThemeTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border-strong dark:border-border-strong-dark bg-light-background dark:bg-app-dark p-4 active:opacity-70"
    >
      {metric ? (
        <MetricIcon metric={metric} size={18} color={t.primary} />
      ) : (
        <Text
          className="text-center text-icon-dim dark:text-icon-dim-dark"
          style={{ fontFamily: "Inter_500Medium", width: 18 }}
        >
          …
        </Text>
      )}
      {/* flex-1 força o Text a preencher o espaço restante do Pressable
          (flex-row) em vez de depender da intrinsic width medida do
          NativeText — Android + Inter custom estava truncando labels no
          meio ("Um copo" em vez de "Um copo d'água"). */}
      <Text
        className={`flex-1 text-sm ${dim ? "text-body-secondary dark:text-body-secondary-dark" : "text-ink dark:text-ink-dark"}`}
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
