// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTable } from "tinybase/ui-react";

import {
  add,
  getById,
  getToday,
  remove,
  store,
  update,
} from "@/infra/database";
import { goBack } from "@/constants/navigation";
import getDate from "@/constants/getDate";
import { useThemeTokens } from "@/constants/themeTokens";

// UI bespoke da tela de alimentação (M5-B fatia 2c, mockup 2a·5).
//
// Diferente do modelo antigo (uma linha por dia com quantity=count), o bespoke
// segue o padrão da água: cada [+] cria um registro com quantity=1 e [−]
// deleta o mais recente do dia. O total exibido é o `sum(quantity)`, e a agrega-
// ção Home usa o mesmo reduce, então registros antigos (quantity=N) continuam
// somando corretamente.
//
// Cada refeição ganha um rótulo automático pelo horário (café/almoço/lanche/
// jantar). O botão "Concluir" só volta pra Home; os +/- já persistem.
//
// Notas + score ficam intencionalmente fora do create (mockup não tem).
//
// Fatia da alimentação do #256: quando `recordId` chega (edição pelo History-
// Card), o componente troca pra <FeedingEdit>: Quantidade + OBS. Score do
// registro antigo é preservado no save (o create v2 não define, mas o v1 sim).

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
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function FeedingBespoke({ onAfterAdd, recordId }) {
  if (recordId)
    return <FeedingEdit recordId={recordId} onAfterSave={onAfterAdd} />;
  return <FeedingCreate onAfterAdd={onAfterAdd} />;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
function FeedingCreate({ onAfterAdd }) {
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
          className="text-primary dark:text-primary-dark"
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 88,
            lineHeight: 92,
          }}
        >
          {totalCount}
        </Text>
        <Text
          className="text-xs text-label dark:text-label-dark"
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
              ? "border-border-subtle dark:border-border-subtle-dark bg-surface-subtle dark:bg-surface-subtle-dark"
              : "border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark active:opacity-70"
          }`}
        >
          <Text
            className={
              totalCount === 0
                ? "text-icon-dim dark:text-icon-dim-dark"
                : "text-ink dark:text-ink-dark"
            }
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 22 }}
          >
            −
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar refeição"
          onPress={handleAdd}
          className="flex-1 items-center rounded-2xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark py-4 active:opacity-70"
        >
          <Text
            className="text-ink dark:text-ink-dark"
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
            className="mb-2.5 text-xs uppercase tracking-wider text-label dark:text-label-dark"
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
                      className="text-xs text-body-secondary dark:text-body-secondary-dark"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {time}
                    </Text>
                    <Text
                      className="text-xs text-ink dark:text-ink-dark"
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
      <View className="rounded-2xl bg-tint-blue dark:bg-tint-blue-dark px-4 py-3">
        <Text
          className="text-sm text-primary dark:text-primary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          3–4 no dia costuma ser um bom ritmo. Sem pressa.
        </Text>
      </View>

      {/* Concluir: só volta pra Home. Cada +/- já persistiu. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Concluir e voltar"
        onPress={() => goBack()}
        className="mt-1 items-center rounded-2xl bg-primary dark:bg-primary-dark py-4 active:opacity-70"
      >
        <Text
          className="text-base text-white dark:text-on-primary-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Concluir
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Edição de um registro de alimentação pelo HistoryCard. Superfície: quantidade
 * de refeições + OBS. Score do registro original é preservado no save (o v2
 * não define, mas o v1 sim). Feeding nunca usou min/max/ideal.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function FeedingEdit({ recordId, onAfterSave }) {
  const t = useThemeTokens();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    setQuantity(String(r.quantity ?? ""));
    setNote(r.note ?? r.observation ?? "");
  }, [recordId]);

  const parsedQty = Number(quantity);
  const canSave = loaded != null && Number.isFinite(parsedQty) && parsedQty > 0;
  const unitLabel = parsedQty === 1 ? "refeição" : "refeições";

  function handleSave() {
    if (!canSave) return;
    update(recordId, {
      unit: loaded.unit || "refeição",
      quantity: parsedQty,
      note,
      score: loaded.score,
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      {/* Quantidade */}
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Quantidade
        </Text>
        <View className="flex-row items-baseline gap-2">
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            placeholderTextColor={t.iconDim}
            keyboardType="numeric"
            maxLength={3}
            accessibilityLabel="Quantidade de refeições"
            style={{
              fontFamily: "JetBrainsMono_500Medium",
              fontSize: 32,
              color: t.ink,
              padding: 0,
              minWidth: 60,
            }}
          />
          <Text
            className="text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 18 }}
          >
            {unitLabel}
          </Text>
        </View>
      </View>

      {/* OBS */}
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          OBS
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Observações sobre refeições..."
          placeholderTextColor={t.iconDim}
          multiline
          accessibilityLabel="Observações"
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: t.ink,
            padding: 0,
            minHeight: 44,
            textAlignVertical: "top",
          }}
        />
      </View>

      {/* Salvar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Salvar alterações"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={handleSave}
        className={`mt-2 items-center rounded-2xl py-4 ${
          canSave
            ? "bg-primary dark:bg-primary-dark active:opacity-70"
            : "bg-border-strong dark:bg-border-strong-dark"
        }`}
      >
        <Text
          className="text-base text-white dark:text-on-primary-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Salvar alterações
        </Text>
      </Pressable>
    </View>
  );
}
