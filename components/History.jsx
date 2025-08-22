import { StyleSheet, Text, useColorScheme, View } from "react-native";
import MyView from "./MyView";
import { Colors } from "@/constants/Colors";
import { useEffect, useState } from "react";
import { get } from "@/infra/database";

export default function History({ tableName, reload }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
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
      {Object.entries(data).map(([id, row]) => (
        <MyView style={styles.card} key={id}>
          <Text style={styles.title}>
            <Text style={styles.text}>{getDate(row.date)} água</Text>
            <Text
              style={[
                styles.score,
                {
                  backgroundColor:
                    row.score === 5 ? Colors.secondary : Colors.primary,
                },
              ]}
            >
              {row.score}
            </Text>
          </Text>
          <Text style={styles.subtext}>
            {row.quantity}ml | Nota {row.score}
          </Text>
          <View className="flex-row items-center">
            <Text style={[styles.subtext, { fontSize: "1.6rem" }]}>OBS: </Text>
            <Text
              style={[
                styles.text,
                { fontWeight: "medium", fontSize: "1.6rem" },
              ]}
            >
              {row.observation}
            </Text>
          </View>
        </MyView>
      ))}
    </MyView>
  );
}
