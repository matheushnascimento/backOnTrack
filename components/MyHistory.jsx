// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useState } from "react";

import { Pressable, Text, View } from "react-native";

import MyView from "./MyView";
import { getCategoryInfo } from "./categoryUtils";

import { get, getByMonth, remove } from "@/infra/database";
import { confirmAction } from "@/constants/dialogs";
import { minutesToHHMM } from "@/constants/duration";
import { router } from "expo-router";
import { maisRecentesPrimeiro } from "@/constants/recordOrder";
//#endregion

function formatDate(date) {
  const parts = String(date ?? "")
    .substring(0, 10)
    .split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Valor principal do registro. Registros novos guardam `quantity` como
// número (minutos, quando unit === "min"); registros antigos podem trazer
// `quantity`/`duration` já como "HH:MM" string — daí o fallback.
function formatQuantity(obj, unit) {
  const raw = obj.quantity ?? obj.duration;
  if (raw == null || raw === "") return "";
  if (unit === "min") {
    if (typeof raw === "string" && raw.includes(":")) return raw;
    return minutesToHHMM(raw);
  }
  return String(raw);
}

/**
 * Card de um registro do histórico (design v2). Mostra nome, valor principal
 * (grande, mono), meta info + OBS + toggles de exercício, ações Editar/Excluir.
 *
 * Props preservadas do formato antigo pra continuar plug-and-play na tela de
 * registro (`MetricScreen`, via `MyHistory`) e no `/history`. `cardStyle`
 * aceito mas não usado — mantido pra compat visual.
 */
export function HistoryCard({
  obj,
  tableName,
  displayName,
  unit,
  exercise,
  hideDate,
  onChanged,
}) {
  const id = obj.id;
  const note = obj.note ?? obj.observation;
  const value = formatQuantity(obj, unit);

  function handleEdit() {
    router.navigate(`/(metrics)/${tableName}?id=${id}`);
  }

  function handleDelete() {
    confirmAction({
      title: "Excluir registro",
      message: "Quer mesmo excluir este registro?",
      confirmLabel: "Excluir",
      onConfirm: () => {
        remove(id);
        onChanged?.();
      },
    });
  }

  const capName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <View className="w-full max-w-[640px] gap-3 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-4">
      {/* Header: nome/data à esquerda, score chip à direita */}
      <View className="flex-row items-baseline justify-between gap-2">
        <View className="flex-1 flex-row items-baseline gap-2">
          {!hideDate && (
            <Text
              className="text-xs tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {formatDate(obj.date)}
            </Text>
          )}
          <Text
            className="text-base text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {capName}
          </Text>
          {exercise && obj.trainingTime && (
            <Text
              className="text-xs text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "JetBrainsMono_400Regular" }}
            >
              · {obj.trainingTime}
            </Text>
          )}
        </View>
        {obj.score != null && obj.score !== "" ? (
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${
              obj.score === 5
                ? "bg-secondary dark:bg-secondary-dark"
                : "bg-primary dark:bg-primary-dark"
            }`}
          >
            <Text
              className="text-xs text-white dark:text-on-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {obj.score}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Valor principal (mono grande) */}
      {value ? (
        <View className="flex-row items-baseline gap-1">
          <Text
            className="text-primary dark:text-primary-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 24 }}
          >
            {value}
          </Text>
          <Text
            className="text-sm text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_400Regular" }}
          >
            {unit}
          </Text>
        </View>
      ) : null}

      {/* Toggles de exercício (só quando aplicável) */}
      {exercise && (
        <View className="flex-row gap-2">
          {obj.training ? <ExerciseChip label="Treino" /> : null}
          {obj.cardio ? <ExerciseChip label="Cardio" /> : null}
        </View>
      )}

      {/* OBS */}
      {note ? (
        <View>
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            OBS
          </Text>
          <Text
            className="mt-1 text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {note}
          </Text>
        </View>
      ) : null}

      {/* Ações */}
      <View className="mt-1 flex-row justify-end gap-2">
        <ActionButton label="Editar" onPress={handleEdit} />
        <ActionButton label="Excluir" onPress={handleDelete} destructive />
      </View>
    </View>
  );
}

/** @param {{ label: string }} props */
function ExerciseChip({ label }) {
  return (
    <View className="rounded-full border border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark px-3 py-1">
      <Text
        className="text-xs text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
    </View>
  );
}

/** @param {{ label: string, onPress: () => void, destructive?: boolean }} props */
function ActionButton({ label, onPress, destructive }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`rounded-xl px-4 py-2 active:opacity-70 ${
        destructive
          ? "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
          : "bg-primary dark:bg-primary-dark"
      }`}
    >
      <Text
        className={`text-sm ${
          destructive ? "text-danger" : "text-white dark:text-on-primary-dark"
        }`}
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HistoryList({
  data,
  tableName,
  displayName,
  unit,
  cardStyle,
  exercise,
  onChanged,
}) {
  return (
    <MyView safe={false} className="w-full items-center gap-3">
      {maisRecentesPrimeiro(Object.values(data)).map((obj) => (
        <HistoryCard
          key={obj.id}
          obj={obj}
          tableName={tableName}
          displayName={displayName}
          unit={unit}
          cardStyle={cardStyle}
          exercise={exercise}
          onChanged={onChanged}
        />
      ))}
    </MyView>
  );
}

export default function MyHistory({ cardStyle, tableName, reload }) {
  const { displayName, unit } = getCategoryInfo(tableName);
  const [data, setData] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(get(tableName) ?? {});
  }, [reload, tick, tableName]);

  return (
    <HistoryList
      data={data}
      tableName={tableName}
      displayName={displayName}
      unit={unit}
      cardStyle={cardStyle}
      onChanged={() => setTick((t) => t + 1)}
    />
  );
}

export function MyMonthHistory({ cardStyle, tableName, month }) {
  const { displayName, unit } = getCategoryInfo(tableName);
  const [data, setData] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(getByMonth(tableName, month) ?? []);
  }, [month, tick, tableName]);

  return (
    <HistoryList
      data={data}
      tableName={tableName}
      displayName={displayName}
      unit={unit}
      cardStyle={cardStyle}
      onChanged={() => setTick((t) => t + 1)}
    />
  );
}

export function MyExerciseHistory({ cardStyle, tableName, reload }) {
  const { displayName, unit } = getCategoryInfo(tableName);
  const [data, setData] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(get(tableName) ?? {});
  }, [reload, tick, tableName]);

  return (
    <HistoryList
      data={data}
      tableName={tableName}
      displayName={displayName}
      unit={unit}
      cardStyle={cardStyle}
      exercise
      onChanged={() => setTick((t) => t + 1)}
    />
  );
}
