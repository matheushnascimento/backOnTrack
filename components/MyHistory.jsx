// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useState } from "react";

import { StyleSheet, Text, useColorScheme, View } from "react-native";

import MyView from "./MyView";
import { getCategoryInfo } from "./categoryUtils";

import { Colors, shadow } from "@/constants/Colors";

import { get, getByMonth } from "@/infra/database";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";
//#endregion

export default function MyHistory({ cardStyle, tableName, reload }) {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { displayName, unity } = getCategoryInfo(tableName);

  const styles = StyleSheet.create({
    container: { alignItems: "center", width: "100%", gap: 10 },
    card: {
      width: "100%",
      maxWidth: 640,
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: 1,
      paddingTop: 1,
      paddingBottom: 1,
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
  });

  const [data, setData] = useState([]);

  //#endregion

  function getDate(date) {
    date = date.substring(0, 10).split("-");
    return `${date[2]}/${date[1]}/${date[0]}`;
  }

  useEffect(() => {
    const tableData = get(tableName) ?? {};
    setData(tableData);
  }, [reload]);

  return (
    <MyView
      style={styles.container}
      onClick={() => router.navigate(`(history)/${tableName}`)}
    >
      {Object.entries(data).map(([id, obj]) => (
        <MyView style={[styles.card, cardStyle, shadow]} key={id}>
          <Text style={styles.title}>
            <Text style={styles.text}>
              {getDate(obj.date)} {displayName}
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
          <Text style={styles.subtext}>
            {obj.quantity ?? obj.duration}
            {unity} | Nota {obj.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: 16 }]}>OBS: </Text>
            <Text style={[styles.text, { fontWeight: "medium", fontSize: 16 }]}>
              {obj.observation}
            </Text>
          </View>
        </MyView>
      ))}
    </MyView>
  );
}
export function MyMonthHistory({ cardStyle, tableName, month }) {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { displayName, unity } = getCategoryInfo(tableName);

  const styles = StyleSheet.create({
    container: { alignItems: "center", width: "100%", gap: 10 },
    card: {
      width: "100%",
      maxWidth: 640,
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: 1,
      paddingTop: 1,
      paddingBottom: 1,
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
  });

  const [data, setData] = useState([]);

  //#endregion

  function getDate(date) {
    date = date.substring(0, 10).split("-");
    return `${date[2]}/${date[1]}/${date[0]}`;
  }

  useEffect(() => {
    const tableData = getByMonth(tableName, month) ?? {};
    setData(tableData);
  }, [month]);

  return (
    <MyView
      style={styles.container}
      onClick={() => router.navigate(`(history)/${tableName}`)}
    >
      {Object.entries(data).map(([id, obj]) => (
        <MyView style={[styles.card, cardStyle, shadow]} key={id}>
          <Text style={styles.title}>
            <Text style={styles.text}>
              {getDate(obj.date)} {displayName}
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
          <Text style={styles.subtext}>
            {obj.quantity ?? obj.duration}
            {unity} | Nota {obj.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: 16 }]}>OBS: </Text>
            <Text style={[styles.text, { fontWeight: "medium", fontSize: 16 }]}>
              {obj.observation}
            </Text>
          </View>
        </MyView>
      ))}
    </MyView>
  );
}
export function MyExerciseHistory({ tableName, reload }) {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { displayName, unity } = getCategoryInfo(tableName);

  const styles = StyleSheet.create({
    container: { alignItems: "center", width: "100%", gap: 10 },
    card: {
      width: "100%",
      maxWidth: 640,
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: 1,
      paddingTop: 1,
      paddingBottom: 1,
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
  });

  const [data, setData] = useState([]);

  //#endregion

  function getDate(date) {
    date = date.substring(0, 10).split("-");
    return `${date[2]}/${date[1]}/${date[0]}`;
  }

  useEffect(() => {
    const tableData = get(tableName) ?? {};
    setData(tableData);
  }, [reload]);

  return (
    <MyView style={styles.container}>
      {Object.entries(data).map(([id, obj]) => (
        <MyView style={[styles.card, shadow]} key={id}>
          <Text style={styles.title}>
            <Text style={styles.text}>
              {getDate(obj.date)} {obj.trainingTime} - {displayName}
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
          <MyView className="flex-row gap-[6]">
            <MyView
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Checkbox color={Colors.primary} value={obj.training} />
              <Text style={styles.text}>Treino</Text>
            </MyView>
            <MyView
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Checkbox color={Colors.primary} value={obj.cardio} />
              <Text style={styles.text}>Cardio</Text>
            </MyView>
          </MyView>

          <Text style={styles.subtext}>
            {obj.quantity ?? obj.duration}
            {unity} | Nota {obj.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: 16 }]}>OBS: </Text>
            <Text style={[styles.text, { fontWeight: "medium", fontSize: 16 }]}>
              {obj.observation}
            </Text>
          </View>
        </MyView>
      ))}
    </MyView>
  );
}
