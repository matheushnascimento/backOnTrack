//#region imports
import { usePathname } from "expo-router";

import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyButton from "@/components/MyButton";
import MyCheckbox from "@/components/MyCheckbox";
import { MyExerciseHistory } from "@/components/MyHistory";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add } from "@/infra/database";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Exercise() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName } = getCategoryInfo(pathname) ?? {};

  //#region states
  const [cardio, setCardio] = useState(false);
  const [date, setDate] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [training, setTraining] = useState(false);
  const [trainingTimeHour, setTrainingTimeHour] = useState("");
  const [trainingTimeMinute, setTrainingTimeMinute] = useState("");
  const [trainingDurationHour, setTrainingDurationHour] = useState("");
  const [trainingDurationMinute, setTrainingDurationMinute] = useState("");
  const [visible, setVisible] = useState(false);
  //#endregion

  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.backgroundCard,
      gap: 32,
      maxWidth: 640,
      borderRadius: 10,
      padding: 10,
      paddingTop: 10,
      paddingBottom: 10,
    },
    cardWrapper: { gap: 16 },
    container: {
      flex: 1,
      alignItems: "center",
      padding: 16,
      gap: 16,
      backgroundColor: theme.background,
    },
    input: {
      width: 80,
      height: 51,
      textAlign: "center",
      padding: 6,
      backgroundColor: "#333",
      fontSize: 26,
      fontWeight: "bold",
      color: "white",
      borderRadius: 10,
      maxWidth: 160,
    },
    inputWrapper: {
      gap: 10,
    },
    title: {
      flexDirection: "row",
      gap: 6,
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
      padding: 6,
      color: theme.text,
      borderRadius: 10,
      backgroundColor: theme.backgroundCard,
      height: 64,
      fontSize: 19,
      fontWeight: "normal",
    },
  }));
  //#endregion

  //#region functions

  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      training,
      cardio,
      trainingTime: `${trainingTimeHour}:${trainingTimeMinute}`,
      duration: `${trainingDurationHour}:${trainingDurationMinute}`,
      score,
      observation,
    };
    add("exercise", data);
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
          {date.displayDate} {displayName}
        </Text>

        {/* card Wrapper */}
        <MyView style={styles.cardWrapper}>
          <MyCheckbox
            value={training}
            label="Treino"
            onValueChange={() => setTraining(!training)}
          />
          <MyCheckbox
            value={cardio}
            label="Cardio"
            onValueChange={() => setCardio(!cardio)}
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

        <MyView className="flex-row flex-wrap gap-4 items-center">
          {/* Hora do exercício */}
          <MyView style={[styles.card, { alignItems: "center" }]}>
            <Text style={styles.title}>Hora do treino</Text>
            <MyView className="flex-row gap-1 justify-center items-center">
              <TextInput
                style={styles.input}
                placeholder="--"
                value={trainingTimeHour}
                onChangeText={(value) => setTrainingTimeHour(value)}
              />
              <Text style={styles.text}>:</Text>
              <TextInput
                style={styles.input}
                placeholder="--"
                value={trainingTimeMinute}
                onChangeText={(value) => setTrainingTimeMinute(value)}
              />
            </MyView>
          </MyView>
          {/* Tempo de treino */}
          <MyView style={[styles.card, { alignItems: "center" }]}>
            <Text style={styles.title}>Tempo de treino</Text>
            <MyView className="flex flex-row gap-1 items-end">
              <TextInput
                style={styles.input}
                placeholder="--"
                value={trainingDurationHour}
                onChangeText={(value) => setTrainingDurationHour(value)}
              />
              <Text style={styles.text}>h</Text>
              <TextInput
                style={styles.input}
                placeholder="--"
                value={trainingDurationMinute}
                onChangeText={(value) => setTrainingDurationMinute(value)}
              />
              <Text style={styles.text}>min</Text>
            </MyView>
          </MyView>
        </MyView>
        <MyButton title="Salvar" onPress={() => handleSubmit()} />
      </MyView>
      <MyExerciseHistory tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
