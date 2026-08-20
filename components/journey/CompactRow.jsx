// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar
import { Pressable, Text, View } from "react-native";

import MetricIcon from "@/components/MetricIcon";
import { useThemeTokens } from "@/constants/themeTokens";
import { METRIC_TINT } from "@/constants/journeyHome";

// Linha da zona "resto do dia" (#291, tela 4a·1 do Turno 4).
//
// Metade da altura do card de foco, sem número grande e sem botões, mas
// **tapável**, abrindo o registro completo. É o que sustenta a promessa do
// rodapé ("Tudo continua registrável"): a hierarquia organiza a atenção, não
// restringe o acesso.

/**
 * @param {{
 *   metric: string,
 *   name: string,
 *   value: string | null,
 *   badge?: string | null,
 *   onPress: () => void,
 * }} props
 */
export default function CompactRow({ metric, name, value, badge, onPress }) {
  const t = useThemeTokens();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Registrar ${name}`}
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-3.5 py-3 active:opacity-70"
    >
      <View
        className={`items-center justify-center rounded-lg ${METRIC_TINT[metric] ?? ""}`}
        style={{ width: 30, height: 30 }}
      >
        <MetricIcon metric={metric} size={16} color={t.primary} />
      </View>

      {/* `flex-1` dá largura ao Text pelo layout. Sem isso ele encolhe ao
          conteúdo e a caixa passa a vir da medição do Android, que erra com a
          Inter e come a última letra. Ver docs e o histórico do #274. */}
      <Text
        className="flex-1 text-sm text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {name}
      </Text>

      {badge ? (
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          {badge}
        </Text>
      ) : null}

      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {value ?? "—"}
      </Text>
    </Pressable>
  );
}
