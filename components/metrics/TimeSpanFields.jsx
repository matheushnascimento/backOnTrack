// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeTokens } from "@/constants/themeTokens";
import { MAX_SPAN_MIN, reconcileTimes } from "@/constants/timeSpan";

import TimePickerField from "./TimePickerField";

// Bloco de início/fim/duração compartilhado pelas três métricas de tempo
// (#366). Existir em um lugar só é o ponto: antes cada tela tinha a sua versão,
// e foi assim que o exercício acabou com início e duração que não conversavam.
//
// ## O valor calculado aparece dim, e não vira estado digitado
//
// O campo que o `reconcileTimes` calculou entra no slot do placeholder do
// TimePickerField, que já renderiza dim. O estado da tela guarda só o que a
// pessoa digitou.
//
// Isso vale inclusive quando ela JÁ digitou aquele campo e ele acabou de ceder
// pra um valor mais novo. O digitado continua no estado, escondido atrás do
// calculado, e volta a aparecer se a contradição desaparecer. O alternativo
// seria descartá-lo, e aí limpar a duração levaria embora o fim que a pessoa
// tinha digitado, que é perda de dado que ninguém pediu.
//
// No save o caller usa o resultado do `reconcileTimes`, e aí o calculado é
// gravado como qualquer outro. Mostrar dim é sinal de procedência, e não de
// valor provisório.

/**
 * Rastro de qual campo foi tocado por último.
 *
 * É o que decide quem cede quando os três se contradizem (ver `quemCede` em
 * `constants/timeSpan.js`). Sem ele a regra não tem como saber qual valor é o
 * mais novo, e a reconciliação viraria chute.
 *
 * `marcar` embrulha o setter da tela: `onChange: marcar("start", setStart)`.
 */
export function useSpanEdits() {
  const [lastEdited, setLastEdited] = useState(
    /** @type {"start"|"end"|"duration"|null} */ (null),
  );
  const marcar = useCallback(
    (key, setter) => (v) => {
      setter(v);
      setLastEdited(key);
    },
    [],
  );
  // Hidratar um registro na edição não é a pessoa digitando: deixar o rastro
  // apontando pro último campo que a tela anterior tocou faria a primeira
  // reconciliação ceder pelo campo errado.
  const esquecer = useCallback(() => setLastEdited(null), []);
  return { lastEdited, marcar, esquecer };
}

/**
 * Reconciliação memoizada, com o teto de sanidade da métrica.
 *
 * Mora junto do componente pra não virar três cópias: cada tela precisava
 * lembrar de passar o `maxMin` certo, e esquecer disso não quebra teste nenhum,
 * só desliga o aviso em silêncio.
 *
 * @param {{
 *   start: string, end: string, duration: string,
 *   metric: "exercise"|"study"|"sleep",
 *   lastEdited?: "start"|"end"|"duration"|null,
 * }} campos
 */
export function useTimeSpan({ start, end, duration, metric, lastEdited }) {
  return useMemo(
    () =>
      reconcileTimes({
        start,
        end,
        duration,
        maxMin: MAX_SPAN_MIN[metric],
        lastEdited,
      }),
    [start, end, duration, metric, lastEdited],
  );
}

/**
 * @param {{
 *   span: {start: string, end: string, duration: string, derived: string|null, issue: ?object, warning: ?object},
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
        // Não depende de o campo estar vazio. Quando ele cedeu, o digitado
        // some de vista e fica guardado no estado da tela, porque mostrar o
        // número velho ao lado dos dois novos seria exibir a contradição que a
        // reconciliação acabou de resolver.
        const calculado = span.derived === f.key;
        return (
          <SpanRow
            key={f.key}
            label={f.label}
            value={calculado ? "" : f.value}
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

      {/* Sem cor de erro, seguindo o aviso do sono (#353): horário que parece
          trocado é engano comum, e não falta. O aviso do teto não impede o
          save, e por isso compartilha o lugar e o tom do hint. */}
      {span.issue || span.warning ? (
        <Text
          className="px-1 text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {(span.issue ?? span.warning).message}
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
