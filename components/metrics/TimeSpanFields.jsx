// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeTokens } from "@/constants/themeTokens";
import { MAX_SPAN_MIN, reconcileTimes } from "@/constants/timeSpan";

import TimePickerField from "./TimePickerField";

// Bloco de início/fim/duração compartilhado pelas três métricas de tempo
// (#366). Existir em um lugar só é o ponto: antes cada tela tinha a sua versão,
// e foi assim que o exercício acabou com início e duração que não conversavam.
//
// ## O valor calculado aparece, mas não é gravado no estado
//
// Quando dois campos determinam o terceiro, o terceiro entra no slot do
// placeholder do TimePickerField, que já renderiza dim. Ele NÃO vira estado
// digitado.
//
// Se o app preenchesse o campo de verdade, os três ficariam "preenchidos" e
// qualquer edição seguinte cairia na regra de conflito: mexer no início
// passaria a contradizer a duração que o próprio app escreveu. Guardando só o
// que a pessoa digitou, o conflito só acontece quando ela digita
// deliberadamente um terceiro valor que não fecha a conta.
//
// No save o caller usa o resultado do `reconcileTimes`, e aí o calculado é
// gravado como qualquer outro. Mostrar dim é sinal de procedência, e não de
// valor provisório.

/**
 * Reconciliação memoizada, com o teto de sanidade da métrica.
 *
 * Mora junto do componente pra não virar três cópias: cada tela precisava
 * lembrar de passar o `maxMin` certo, e esquecer disso não quebra teste nenhum,
 * só desliga o aviso em silêncio.
 *
 * @param {{start: string, end: string, duration: string, metric: "exercise"|"study"|"sleep"}} campos
 */
export function useTimeSpan({ start, end, duration, metric }) {
  return useMemo(
    () =>
      reconcileTimes({ start, end, duration, maxMin: MAX_SPAN_MIN[metric] }),
    [start, end, duration, metric],
  );
}

/**
 * @param {{
 *   span: {start: string, end: string, duration: string, derived: string|null, issue: {code: string, message: string}|null},
 *   fields: Array<{
 *     key: "start"|"end"|"duration",
 *     label: string,
 *     placeholder: string,
 *     value: string,
 *     onChange: (v: string) => void,
 *     agora?: () => void,
 *     agoraLabel?: string,
 *   }>,
 *   hint?: string,
 * }} props
 */
export default function TimeSpanFields({ span, fields, hint }) {
  return (
    <View className="gap-4">
      {fields.map((f) => {
        const calculado = span.derived === f.key && !f.value;
        return (
          <SpanRow
            key={f.key}
            label={f.label}
            value={f.value}
            onChange={f.onChange}
            // Com o campo calculado, o número derivado ocupa o lugar do
            // exemplo: ver "1:30" dim diz mais que ver "0:45" dim.
            placeholder={calculado ? span[f.key] : f.placeholder}
            calculado={calculado}
            agora={f.agora}
            agoraLabel={f.agoraLabel}
          />
        );
      })}

      {/* Sem cor de erro, seguindo o aviso do sono (#353): horários que não
          fecham são engano comum, e não falta. */}
      {span.issue ? (
        <Text
          className="px-1 text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {span.issue.message}
        </Text>
      ) : hint ? (
        <Text
          className="px-1 text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Mesma caixa do `TimeRow` do sono, com o selo de calculado a mais.
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder: string,
 *   calculado: boolean,
 *   agora?: () => void,
 *   agoraLabel?: string,
 * }} props
 */
function SpanRow({
  label,
  value,
  onChange,
  placeholder,
  calculado,
  agora,
  agoraLabel,
}) {
  const t = useThemeTokens();
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            {label}
          </Text>
          {/* Dizer de onde veio o número. Sem isso o valor dim pareceria
              exemplo, e a pessoa digitaria em cima do que já estava certo. */}
          {calculado ? (
            <Text
              className="text-xs text-primary dark:text-primary-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              calculado
            </Text>
          ) : null}
        </View>
        <TimePickerField
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          accessibilityLabel={
            calculado ? `${label}, calculado: ${placeholder}` : label
          }
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 24,
            color: t.ink,
            padding: 0,
            minWidth: 80,
          }}
        />
      </View>
      <View className="items-end">
        {agora ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={agoraLabel}
            onPress={agora}
            className="rounded-full border border-primary dark:border-primary-dark px-3 py-1 active:opacity-70"
          >
            <Text
              className="text-xs text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {agoraLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
