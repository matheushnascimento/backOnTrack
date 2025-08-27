//#region imports
import { useEffect, useState } from "react";

import { StyleSheet, Text, useColorScheme, View } from "react-native";

import MyView from "./MyView";
import { getCategoryInfo } from "./categoryUtils";

import { Colors } from "@/constants/Colors";

import { get } from "@/infra/database";
import Checkbox from "expo-checkbox";
//#endregion

export default function MyHistory({ tableName, reload }) {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { displayName, unity } = getCategoryInfo(tableName);

  const styles = StyleSheet.create({
    container: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      gap: 10,
    },
    card: {
      display: "flex",
      width: "100%",
      maxWidth: "40rem",
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: "1rem",
      paddingTop: "1rem",
      paddingBottom: "1rem",
      boxShadow: Colors.shadow,
    },
    text: {
      width: "fit",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
    subtext: {
      color: theme.text,
      opacity: "50%",
      fontWeight: "bold",
      fontSize: "1.2rem",
    },
    title: {
      fontSize: "1.8rem",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    score: {
      textAlign: "center",
      lineHeight: "auto",
      color: theme.text,
      fontWeight: "bold",
      fontSize: "1.6rem",
      width: "2.4rem",
      height: "2.4rem",
      borderRadius: 100,
      boxShadow: "0 .4rem .4rem 0 rgba(0,0,0,.25)",
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
        <MyView style={styles.card} key={id}>
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
            {obj.quantity ?? obj.trainingDuration}
            {unity} | Nota {obj.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: "1.6rem" }]}>OBS: </Text>
            <Text
              style={[
                styles.text,
                { fontWeight: "medium", fontSize: "1.6rem" },
              ]}
            >
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
    container: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      gap: 10,
    },
    card: {
      display: "flex",
      width: "100%",
      maxWidth: "40rem",
      gap: 10,
      backgroundColor: theme.backgroundCard,
      borderRadius: 6,
      padding: "1rem",
      paddingTop: "1rem",
      paddingBottom: "1rem",
      boxShadow: Colors.shadow,
    },
    text: {
      width: "fit",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
    subtext: {
      color: theme.text,
      opacity: "50%",
      fontWeight: "bold",
      fontSize: "1.2rem",
    },
    title: {
      fontSize: "1.8rem",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    score: {
      textAlign: "center",
      lineHeight: "auto",
      color: theme.text,
      fontWeight: "bold",
      fontSize: "1.6rem",
      width: "2.4rem",
      height: "2.4rem",
      borderRadius: 100,
      boxShadow: "0 .4rem .4rem 0 rgba(0,0,0,.25)",
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
        <MyView style={styles.card} key={id}>
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
          <MyView className="flex-row gap-[.6rem]">
            <MyView
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: ".6rem",
              }}
            >
              <Checkbox color={Colors.primary} value={obj.training} />
              <Text style={styles.text}>Treino</Text>
            </MyView>
            <MyView
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: ".6rem",
              }}
            >
              <Checkbox color={Colors.primary} value={obj.cardio} />
              <Text style={styles.text}>Cardio</Text>
            </MyView>
          </MyView>

          <Text style={styles.subtext}>
            {obj.quantity ?? obj.trainingDuration}
            {unity} | Nota {obj.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: "1.6rem" }]}>OBS: </Text>
            <Text
              style={[
                styles.text,
                { fontWeight: "medium", fontSize: "1.6rem" },
              ]}
            >
              {obj.observation}
            </Text>
          </View>
        </MyView>
      ))}
    </MyView>
  );
}
