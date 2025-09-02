//#region imports
import { usePathname } from "expo-router";

import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import { Colors } from "@/constants/Colors";
import MyButton from "@/components/MyButton";
import MyCheckbox from "@/components/MyCheckbox";
import MyHistory from "@/components/MyHistory";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add } from "@/infra/database";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Study() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, Icon } = getCategoryInfo(pathname);

  //#region states
  const [date, setDate] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [studied, setStudied] = useState();
  const [studyDurationHour, setStudyDurationHour] = useState("");
  const [studyDurationMinute, setStudyDurationMinute] = useState("");
  const [visible, setVisible] = useState(false);
  //#endregion

  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.backgroundCard,
      display: "flex",
      gap: "2rem",
      maxWidth: "40rem",
      borderRadius: ".6rem",
      padding: 10,
      paddingTop: 10,
      paddingBottom: 10,
      boxShadow: Colors.shadow,
    },
    cardWrapper: { gap: "1rem" },
    container: {
      flex: 1,
      alignItems: "center",
      padding: "1rem",
      gap: "1rem",
      backgroundColor: theme.background,
    },
    input: {
      width: "5rem",
      height: "3.2rem",
      textAlign: "center",
      padding: ".4rem",
      backgroundColor: "#333",
      fontSize: "1.6rem",
      fontWeight: "bold",
      color: "white",
      borderRadius: ".6rem",
      maxWidth: "10rem",
      boxShadow: Colors.shadow,
    },
    inputWrapper: {
      width: "fit",
      gap: ".6rem",
    },
    title: {
      width: "fit",
      display: "flex",
      flexDirection: "row",
      gap: ".4rem",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
    text: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
    textArea: {
      padding: ".4rem",
      fontSize: "1.6rem",
      fontWeight: "bold",
      color: theme.text,
      borderRadius: ".6rem",
      boxShadow: Colors.shadow,
      backgroundColor: theme.backgroundCard,
      height: "4rem",
      fontSize: "1.2rem",
      fontWeight: "regular",
    },
  }));
  //#endregion

  //#region functions

  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      duration: `${studyDurationHour}:${studyDurationMinute}`,
      score,
      observation,
    };
    add("study", data);
    setReloadKey((prev) => prev + 1);
  }
  function onDismissSnackBar() {
    setVisible(false);
  }
  //#endregion

  return (
    <MyView safe={true} style={styles.container}>
      <Snackbar
        visible={visible}
        onDismiss={onDismissSnackBar}
        action={{
          label: "Fechar",
        }}
      >
        Seus dados estão salvos! (Enquanto você não recarregar o app)
      </Snackbar>
      <MyView style={styles.card}>
        <Text style={styles.title}>
          {Icon && <Icon size={24} color={Colors.primary} />} {date.displayDate}{" "}
          {displayName}
        </Text>

        {/* card Wrapper */}
        <MyView style={styles.cardWrapper}>
          <MyCheckbox
            value={studied}
            label="Feito"
            onValueChange={() => setStudied(!studied)}
          />
        </MyView>

        {/* Nota */}
        <Text style={styles.title}>Nota</Text>
        <Score value={score} onPress={setScore} />

        {/* OBS */}
        <MyView className="gap-1">
          <Text style={styles.title}>OBS:</Text>
          <TextInput
            value={observation}
            onChangeText={(value) => setObservation(value)}
            style={styles.textArea}
            placeholder="Observações sobre o exercício..."
          />
        </MyView>

        <MyView className="flex-row gap-[1rem] items-end justify-between">
          {/* Tempo de treino */}
          <MyView style={[styles.card, { alignItems: "center" }]}>
            <Text style={styles.title}>Tempo de estudo</Text>
            <MyView className="flex flex-row gap-1 items-end">
              <TextInput
                style={styles.input}
                placeholder="--"
                value={studyDurationHour}
                onChangeText={(value) => setStudyDurationHour(value)}
              />
              <Text style={styles.text}>h</Text>
              <TextInput
                style={styles.input}
                placeholder="--"
                value={studyDurationMinute}
                onChangeText={(value) => setStudyDurationMinute(value)}
              />
              <Text style={styles.text}>min</Text>
            </MyView>
          </MyView>
          <MyButton
            style={{ height: "fit-content" }}
            title="Salvar"
            onPress={() => handleSubmit()}
          />
        </MyView>
      </MyView>
      <MyHistory tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
