// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTable } from "tinybase/ui-react";

import { add, getById, getToday, store, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { useThemeTokens } from "@/constants/themeTokens";

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
//
// Fatia da água do #256: quando `recordId` chega (edição pelo HistoryCard), o
// componente troca pra um formulário de edição minimalista (quantidade + OBS),
// preservando os campos legados do registro (score/min/max/ideal) intactos —
// eles não fazem parte do fluxo de criação v2 mas existem em registros antigos.

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
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function WaterQuickAdd({ onAfterAdd, recordId }) {
  if (recordId)
    return <WaterEdit recordId={recordId} onAfterSave={onAfterAdd} />;
  return <WaterQuickLog onAfterAdd={onAfterAdd} />;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
function WaterQuickLog({ onAfterAdd }) {
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

/**
 * Edição de um registro de água pelo HistoryCard. Superfície mínima: quantidade
 * (ml) + OBS. Score/min/max/ideal do registro original são preservados no save
 * (o fluxo de criação v2 não os define, mas registros antigos podem tê-los).
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function WaterEdit({ recordId, onAfterSave }) {
  const t = useThemeTokens();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  // Guarda o registro original pra preservar campos legados no update
  // (score/min/max/ideal). Hidrata uma vez — sem reagir a mudanças pra não
  // sobrescrever o que o usuário está editando.
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

  function handleSave() {
    if (!canSave) return;
    update(recordId, {
      unit: "ml",
      quantity: parsedQty,
      note,
      score: loaded.score,
      min: loaded.min,
      max: loaded.max,
      ideal: loaded.ideal,
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
            maxLength={5}
            accessibilityLabel="Quantidade em mililitros"
            style={{
              fontFamily: "JetBrainsMono_500Medium",
              fontSize: 32,
              color: t.ink,
              padding: 0,
              minWidth: 100,
            }}
          />
          <Text
            className="text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 18 }}
          >
            ml
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
          placeholder="Observações sobre água..."
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
