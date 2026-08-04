// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTable } from "tinybase/ui-react";

import { add, getToday, store } from "@/infra/database";
import getDate from "@/constants/getDate";

// UI bespoke da tela de água (M5-B fatia 2a, mockup 2a·2 do Claude Design).
// Substitui o card Score/OBS/Top/Bottom da MetricScreen quando o registry
// aponta pra `renderCustom`. Padrão "quick log":
//
//   [big number: 1,4 L]
//   [de 2 L hoje]  [==== progress bar]
//
//   ADICIONAR
//   [+ 200 ml / copo]   [+ 500 ml / garrafa]
//   [+ 1 L / squeeze]
//
//   REGISTROS DE HOJE
//   08:15         200 ml
//   ...
//
// Cada chip cria um registro imediatamente (sem staging). Snackbar do
// MetricScreen (via onAfterAdd) confirma. "outro…" custom amount fica pra
// sub-fatia futura.

const GOAL_ML = 2000;

const QUICK_ADD = [
  { amount: 200, label: "200 ml", hint: "copo" },
  { amount: 500, label: "500 ml", hint: "garrafa" },
  { amount: 1000, label: "1 L", hint: "squeeze" },
];

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
export default function WaterQuickAdd({ onAfterAdd }) {
  // Assina a tabela pra re-renderizar quando um novo registro chega (inclusive
  // pós-startAutoLoad da persistência). Mesmo padrão da Home.
  const records = useTable("records", store);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => getToday(), [records]);
  const waterToday = today.water ?? [];

  const totalMl = waterToday.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalL = totalMl / 1000;
  const pct = Math.min(100, Math.round((totalMl / GOAL_ML) * 100));

  function handleAdd(amount) {
    add("water", {
      date: getDate().ISOdate,
      unit: "ml",
      quantity: amount,
    });
    onAfterAdd?.();
  }

  return (
    <View className="gap-6">
      {/* Big number */}
      <View className="items-center gap-3">
        <View className="flex-row items-baseline gap-1.5">
          <Text
            className="text-primary dark:text-primary-dark"
            style={{
              fontFamily: "JetBrainsMono_500Medium",
              fontSize: 72,
              lineHeight: 76,
            }}
          >
            {totalL.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </Text>
          <Text
            className="text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 20 }}
          >
            L
          </Text>
        </View>
        <Text
          className="text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          de {GOAL_ML / 1000} L hoje
        </Text>
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
          <View
            className="h-full rounded-full bg-primary dark:bg-primary-dark"
            style={{ width: `${pct}%` }}
          />
        </View>
      </View>

      {/* Quick add chips */}
      <View>
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Adicionar
        </Text>
        <View className="flex-row flex-wrap -m-1">
          {QUICK_ADD.map((qa) => (
            <View key={qa.amount} className="w-1/2 p-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${qa.label}`}
                onPress={() => handleAdd(qa.amount)}
                className="gap-0.5 rounded-2xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark p-4 active:opacity-70"
              >
                <Text
                  className="text-base text-ink dark:text-ink-dark"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  + {qa.label}
                </Text>
                <Text
                  className="text-xs text-label dark:text-label-dark"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {qa.hint}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Today's entries */}
      {waterToday.length > 0 && (
        <View>
          <Text
            className="mb-2.5 text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Registros de hoje
          </Text>
          <View className="gap-2">
            {waterToday.map((r) => (
              <View key={r.id} className="flex-row justify-between">
                <Text
                  className="text-xs text-body-secondary dark:text-body-secondary-dark"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {formatTime(r.createdAt)}
                </Text>
                <Text
                  className="text-xs text-ink dark:text-ink-dark"
                  style={{ fontFamily: "JetBrainsMono_400Regular" }}
                >
                  {r.quantity} ml
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
