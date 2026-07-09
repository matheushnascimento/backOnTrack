// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useState } from "react";

import { Alert, StyleSheet, Text, useColorScheme, View } from "react-native";

import MyView from "./MyView";
import MyButton from "./MyButton";
import { getCategoryInfo } from "./categoryUtils";

import { Colors, shadow } from "@/constants/Colors";

import { get, getByMonth, remove } from "@/infra/database";
import { minutesToHHMM } from "@/constants/duration";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";
//#endregion

function makeStyles(theme) {
  return StyleSheet.create({
    container: { alignItems: "center", width: "100%", gap: 10 },
    card: {
      width: "100%",
      maxWidth: 640,
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: 10,
    },
    text: { color: theme.text, fontWeight: "bold", fontSize: 18 },
    subtext: {
      color: theme.text,
      opacity: 0.5,
      fontWeight: "bold",
      fontSize: 12,
    },
    title: {
      fontSize: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    score: {
      textAlign: "center",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 16,
      width: 24,
      height: 24,
      borderRadius: 100,
    },
    actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  });
}

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

function HistoryCard({
  obj,
  tableName,
  displayName,
  unit,
  styles,
  cardStyle,
  exercise,
  onChanged,
}) {
  const id = obj.id;
  const note = obj.note ?? obj.observation;

  function handleEdit() {
    router.navigate(`/(metrics)/${tableName}?id=${id}`);
  }

  function handleDelete() {
    Alert.alert("Excluir registro", "Quer mesmo excluir este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          remove(id);
          onChanged?.();
        },
      },
    ]);
  }

  return (
    <MyView safe={false} style={[styles.card, cardStyle, shadow]}>
      <Text style={styles.title}>
        <Text style={styles.text}>
          {formatDate(obj.date)}
          {exercise && obj.trainingTime ? ` ${obj.trainingTime}` : ""}{" "}
          {displayName}
        </Text>
        <Text
          style={[
            styles.score,
            {
              backgroundColor:
                obj.score === 5 ? Colors.secondary : Colors.primary,
            },
          ]}
        >
          {obj.score}
        </Text>
      </Text>

      {exercise && (
        <MyView safe={false} className="flex-row gap-4">
          <MyView
            safe={false}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Checkbox color={Colors.primary} value={!!obj.training} />
            <Text style={styles.text}>Treino</Text>
          </MyView>
          <MyView
            safe={false}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Checkbox color={Colors.primary} value={!!obj.cardio} />
            <Text style={styles.text}>Cardio</Text>
          </MyView>
        </MyView>
      )}

      <Text style={styles.subtext}>
        {formatQuantity(obj, unit)}
        {unit} | Nota {obj.score}
      </Text>
      <View className="flex-row items-center">
        <Text style={[styles.subtext, { fontSize: 16 }]}>OBS: </Text>
        <Text style={[styles.text, { fontWeight: "medium", fontSize: 16 }]}>
          {note}
        </Text>
      </View>

      <MyView safe={false} style={styles.actions}>
        <MyButton title="Editar" onPress={handleEdit} />
        <MyButton title="Excluir" onPress={handleDelete} />
      </MyView>
    </MyView>
  );
}

export default function MyHistory({ cardStyle, tableName, reload }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const styles = makeStyles(theme);
  const { displayName, unit } = getCategoryInfo(tableName);

  const [data, setData] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(get(tableName) ?? {});
  }, [reload, tick, tableName]);

  return (
    <MyView safe={false} style={styles.container}>
      {Object.values(data).map((obj) => (
        <HistoryCard
          key={obj.id}
          obj={obj}
          tableName={tableName}
          displayName={displayName}
          unit={unit}
          styles={styles}
          cardStyle={cardStyle}
          onChanged={() => setTick((t) => t + 1)}
        />
      ))}
    </MyView>
  );
}

export function MyMonthHistory({ cardStyle, tableName, month }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const styles = makeStyles(theme);
  const { displayName, unit } = getCategoryInfo(tableName);

  const [data, setData] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(getByMonth(tableName, month) ?? []);
  }, [month, tick, tableName]);

  return (
    <MyView safe={false} style={styles.container}>
      {Object.values(data).map((obj) => (
        <HistoryCard
          key={obj.id}
          obj={obj}
          tableName={tableName}
          displayName={displayName}
          unit={unit}
          styles={styles}
          cardStyle={cardStyle}
          onChanged={() => setTick((t) => t + 1)}
        />
      ))}
    </MyView>
  );
}

export function MyExerciseHistory({ cardStyle, tableName, reload }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const styles = makeStyles(theme);
  const { displayName, unit } = getCategoryInfo(tableName);

  const [data, setData] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(get(tableName) ?? {});
  }, [reload, tick, tableName]);

  return (
    <MyView safe={false} style={styles.container}>
      {Object.values(data).map((obj) => (
        <HistoryCard
          key={obj.id}
          obj={obj}
          tableName={tableName}
          displayName={displayName}
          unit={unit}
          styles={styles}
          cardStyle={cardStyle}
          exercise
          onChanged={() => setTick((t) => t + 1)}
        />
      ))}
    </MyView>
  );
}
