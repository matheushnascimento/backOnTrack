// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable } from "tinybase/ui-react";

import { add, getToday, remove, store } from "@/infra/database";
import getDate from "@/constants/getDate";

// UI bespoke da tela de alimentação (M5-B fatia 2c, mockup 2a·5).
//
// Diferente do modelo antigo (uma linha por dia com quantity=count), o bespoke
// segue o padrão da água: cada [+] cria um registro com quantity=1 e [−]
// deleta o mais recente do dia. O total exibido é o `sum(quantity)` — a agrega-
// ção Home usa o mesmo reduce, então registros antigos (quantity=N) continuam
// somando corretamente.
//
// Cada refeição ganha um rótulo automático pelo horário (café/almoço/lanche/
// jantar). O botão "Concluir" só volta pra Home; os +/- já persistem.
//
// Notas + score ficam intencionalmente fora (mockup não tem). Edição via ?id=
// cai no genérico com CounterField.

function mealLabel(hourNumber) {
  if (hourNumber < 11) return "café";
  if (hourNumber < 15) return "almoço";
  if (hourNumber < 18) return "lanche";
  return "jantar";
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
export default function FeedingBespoke({ onAfterAdd }) {
  const records = useTable("records", store);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => getToday(), [records]);
  const feedingToday = today.feeding ?? [];

  const totalCount = feedingToday.reduce(
    (s, r) => s + (Number(r.quantity) || 0),
    0,
  );

  function handleAdd() {
    add("feeding", {
      date: getDate().ISOdate,
      unit: "refeição",
      quantity: 1,
    });
    onAfterAdd?.();
  }

  function handleRemove() {
    if (feedingToday.length === 0) return;
    // Deleta o mais recente do dia. Ordena por createdAt desc (getToday não
    // garante ordem).
    const sorted = [...feedingToday].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    remove(sorted[0].id);
    onAfterAdd?.();
  }

  return (
    <View className="gap-5">
      {/* Big number */}
      <View className="items-center gap-2">
        <Text
          className="text-primary"
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 88,
            lineHeight: 92,
            letterSpacing: -2.5,
          }}
        >
          {totalCount}
        </Text>
        <Text
          className="text-xs text-label"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {totalCount === 1 ? "refeição hoje" : "refeições hoje"}
        </Text>
      </View>

      {/* +/- controls */}
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remover última refeição"
          accessibilityState={{ disabled: totalCount === 0 }}
          disabled={totalCount === 0}
          onPress={handleRemove}
          className={`flex-1 items-center rounded-2xl border py-4 ${
            totalCount === 0
              ? "border-border-subtle bg-surface-subtle"
              : "border-border-strong bg-white active:opacity-70"
          }`}
        >
          <Text
            className={totalCount === 0 ? "text-icon-dim" : "text-ink"}
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 22 }}
          >
            −
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar refeição"
          onPress={handleAdd}
          className="flex-1 items-center rounded-2xl border border-border-strong bg-white py-4 active:opacity-70"
        >
          <Text
            className="text-ink"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 22 }}
          >
            +
          </Text>
        </Pressable>
      </View>

      {/* Registros de hoje */}
      {feedingToday.length > 0 && (
        <View>
          <Text
            className="mb-2.5 text-xs uppercase tracking-wider text-label"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Registros de hoje
          </Text>
          <View className="gap-2">
            {[...feedingToday]
              .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
              .map((r) => {
                const time = formatTime(r.createdAt);
                const hour = new Date(r.createdAt ?? 0).getHours();
                return (
                  <View key={r.id} className="flex-row justify-between">
                    <Text
                      className="text-xs text-body-secondary"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {time}
                    </Text>
                    <Text
                      className="text-xs text-ink"
                      style={{ fontFamily: "JetBrainsMono_400Regular" }}
                    >
                      {mealLabel(hour)}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* Info card sereno */}
      <View className="rounded-2xl bg-tint-blue px-4 py-3">
        <Text
          className="text-sm text-primary"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          3–4 no dia costuma ser um bom ritmo. Sem pressa.
        </Text>
      </View>

      {/* Concluir — só volta pra Home. Cada +/- já persistiu. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Concluir e voltar"
        onPress={() => router.back()}
        className="mt-1 items-center rounded-2xl bg-primary py-4 active:opacity-70"
      >
        <Text
          className="text-base text-white"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Concluir
        </Text>
      </Pressable>
    </View>
  );
}
