// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { Pressable, Text, View } from "react-native";

// Aviso de regressão (#293, tela 4a·2 do Turno 4).
//
// **A tela mais difícil do modelo.** Se ela der vontade de fechar o app, o
// resto desmorona. Foi assim que o briefing a descreveu, e o designer a
// tratou como prioridade.
//
// Três escolhas que sustentam isso:
//
// 1. **Aviso no topo, não modal.** Não bloqueia. A pessoa pode ignorar e
//    registrar, porque o app não sequestra a tela pra falar de queda.
// 2. **Zero vermelho.** Fundo neutro (`surface-subtle`). O `danger` segue
//    reservado pro destrutivo, como manda o design v2.
// 3. **"Ver histórico" ao lado de "Entendi"**: a promessa de que nada sumiu
//    vem com um caminho pra conferir. Provar, não afirmar.

/**
 * @param {{
 *   copy: {title: string, body: string, preserved: string, history: string, dismiss: string},
 *   onHistory: () => void,
 *   onDismiss: () => void,
 * }} props
 */
export default function RegressionNotice({ copy, onHistory, onDismiss }) {
  return (
    <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-surface-subtle dark:bg-surface-subtle-dark p-4">
      <Text
        className="text-sm uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {copy.title}
      </Text>

      <Text
        className="text-sm text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_400Regular", lineHeight: 20 }}
      >
        {copy.body}
      </Text>

      {/* A dúvida que a regressão levanta, respondida antes de ser feita. */}
      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular", lineHeight: 18 }}
      >
        {copy.preserved}
      </Text>

      <View className="mt-1 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.history}
          onPress={onHistory}
          className="flex-1 rounded-xl border border-border-strong dark:border-border-strong-dark py-2.5 active:opacity-70"
        >
          <Text
            className="text-center text-xs text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {copy.history}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.dismiss}
          onPress={onDismiss}
          className="flex-1 rounded-xl bg-primary dark:bg-primary-dark py-2.5 active:opacity-70"
        >
          <Text
            className="text-center text-xs text-white dark:text-on-primary-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {copy.dismiss}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
