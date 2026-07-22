// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useState } from "react";

import { Text, View } from "react-native";

import MyView from "./MyView";
import MyButton from "./MyButton";
import { getCategoryInfo } from "./categoryUtils";

import { Colors, shadow } from "@/constants/Colors";

import { get, getByMonth, remove } from "@/infra/database";
import { confirmAction } from "@/constants/dialogs";
import { minutesToHHMM } from "@/constants/duration";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";
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

export function HistoryCard({
  obj,
  tableName,
  displayName,
  unit,
  cardStyle,
  exercise,
  hideDate,
  onChanged,
}) {
  const id = obj.id;
  const note = obj.note ?? obj.observation;

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

  return (
    <MyView
      safe={false}
      className="w-full max-w-[640px] gap-2.5 rounded-md bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
      style={[cardStyle, shadow]}
    >
      <View className="w-full flex-row items-center justify-between">
        <Text className="font-bold text-lg text-light-text dark:text-dark-text">
          {hideDate ? "" : `${formatDate(obj.date)} `}
          {exercise && obj.trainingTime ? `${obj.trainingTime} ` : ""}
          {displayName}
        </Text>
        <Text
          className={`h-6 w-6 rounded-full text-center font-bold text-base text-light-text dark:text-dark-text ${
            obj.score === 5 ? "bg-secondary" : "bg-primary"
          }`}
        >
          {obj.score}
        </Text>
      </View>

      {exercise && (
        <MyView safe={false} className="flex-row gap-4">
          <MyView safe={false} className="flex-row items-center gap-1.5">
            <Checkbox color={Colors.primary} value={!!obj.training} />
            <Text className="font-bold text-lg text-light-text dark:text-dark-text">
              Treino
            </Text>
          </MyView>
          <MyView safe={false} className="flex-row items-center gap-1.5">
            <Checkbox color={Colors.primary} value={!!obj.cardio} />
            <Text className="font-bold text-lg text-light-text dark:text-dark-text">
              Cardio
            </Text>
          </MyView>
        </MyView>
      )}

      <Text className="font-bold text-xs text-light-text opacity-50 dark:text-dark-text">
        {formatQuantity(obj, unit)}
        {unit} | Nota {obj.score}
      </Text>
      <View className="flex-row items-center">
        <Text className="font-bold text-base text-light-text opacity-50 dark:text-dark-text">
          OBS:{" "}
        </Text>
        <Text className="font-medium text-base text-light-text dark:text-dark-text">
          {note}
        </Text>
      </View>

      <MyView safe={false} className="flex-row justify-end gap-2">
        <MyButton title="Editar" onPress={handleEdit} />
        <MyButton title="Excluir" onPress={handleDelete} />
      </MyView>
    </MyView>
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
    <MyView safe={false} className="w-full items-center gap-2.5">
      {Object.values(data).map((obj) => (
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
