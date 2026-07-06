//#region imports
import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyView from "@/components/MyView";
import Score from "@/components/Score";
import MyButton from "@/components/MyButton";

import { add } from "@/infra/database";
import MyHistory from "@/components/MyHistory";
import getDate from "@/constants/getDate";
import { usePathname } from "expo-router";
import { getCategoryInfo } from "@/components/categoryUtils";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Sleep() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName } = getCategoryInfo(pathname) ?? {};

  //#region states
  const [date, setDate] = useState(getDate());
  const [ideal, setIdeal] = useState(8);
  const [score, setScore] = useState();
  const [min, setMin] = useState(7);
  const [max, setMax] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [sleepHours, setSleepHours] = useState();
  const [sleepMinutes, setSleepMinutes] = useState();
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
    cardWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    container: {
      flex: 1,
      alignItems: "center",
      gap: 16,
      padding: 16,
      backgroundColor: theme.background,
    },
    input: {
      padding: 6,
      backgroundColor: theme.backgroundCard,
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
      min,
      max,
      ideal,
      quantity: `${sleepHours ?? "00"}:${sleepMinutes ?? "00"}`,
      unity: "h",
      score,
      observation,
    };
    add("sleep", data);
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
          {/* Input Wrapper */}
          <MyView style={styles.inputWrapper}>
            <Text style={styles.title}>MIN</Text>
            <TextInput style={styles.input} placeholder="--" value={min} />
          </MyView>
          {/* Input Wrapper */}
          <MyView style={styles.inputWrapper}>
            <Text style={styles.title}>MAX</Text>
            <TextInput
              style={styles.input}
              placeholder="--"
              value={max}
              onChangeText={(value) => setMax(value)}
            />
          </MyView>
          {/* Input Wrapper */}
          <MyView style={styles.inputWrapper}>
            <Text style={styles.title}>IDEAL</Text>
            <TextInput style={styles.input} placeholder="--" value={ideal} />
          </MyView>
        </MyView>

        <Text style={styles.title}>Nota</Text>
        <Score value={score} onPress={setScore} />

        <MyView className="gap-1">
          <Text style={styles.title}>OBS:</Text>
          <TextInput
            value={observation}
            onChangeText={(value) => setObservation(value)}
            style={styles.textArea}
            placeholder="Observações sobre sono..."
          />
        </MyView>

        <MyView className=" flex-row flex-wrap justify-center items-center gap-4">
          <MyView
            className="min-w-1/2 w-full rounded-md flex-row gap-4 justify-center items-start"
            style={[
              styles.card,
              {
                width: "50%",
                justifyContent: "center",
                alignItems: "center",
                flexGrow: 1,
                flexDirection: "row",
              },
            ]}
          >
            <Text
              style={styles.title}
              className="text-white font-bold text-2xl"
            >
              {displayName} hoje
            </Text>
            <TextInput
              className="max-w-[38px] text-center bg-[#333333] h-[37px] px-1 text-xl font-normal text-white rounded-md"
              placeholder="--"
              value={sleepHours}
              onChangeText={(value) => setSleepHours(value)}
            />
            <Text style={styles.title}>h</Text>
            <TextInput
              className="max-w-[38px] text-center bg-[#333333] h-[37px] px-1 text-xl font-normal text-white rounded-md"
              placeholder="--"
              value={sleepMinutes}
              onChangeText={(value) => setSleepMinutes(value)}
            />
            <Text style={styles.title}>min</Text>
          </MyView>
          <MyButton title="Salvar" onPress={() => handleSubmit()} />
        </MyView>
      </MyView>
      <MyHistory tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
