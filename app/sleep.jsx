//#region imports
import { useState } from "react";
import { StyleSheet, Text, TextInput, useColorScheme } from "react-native";
import { Snackbar } from "react-native-paper";

import { Colors } from "@/constants/Colors";

import MyView from "@/components/MyView";
import Score from "@/components/Score";
import MyButton from "@/components/MyButton";

import { add } from "@/infra/database";
import History from "@/components/History";
import getDate from "@/constants/getDate";
import { usePathname } from "expo-router";
import { getCategoryInfo } from "@/components/categoryUtils";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Sleep() {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const pathname = usePathname().substring(1);
  const { displayName, Icon } = getCategoryInfo(pathname);

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
      display: "flex",
      gap: "2rem",
      maxWidth: "40rem",
      borderRadius: ".6rem",
      padding: 10,
      paddingTop: 10,
      paddingBottom: 10,
      boxShadow: Colors.shadow,
    },
    cardWrapper: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    container: {
      flex: 1,
      alignItems: "center",
      gap: "1rem",
      padding: "1rem",
      backgroundColor: theme.background,
    },
    input: {
      padding: ".4rem",
      backgroundColor: theme.backgroundCard,
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
      min,
      max,
      ideal,
      quantity: `${sleepHours}:${sleepMinutes ?? "00"}`,
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
          {Icon && <Icon size={24} color={Colors.primary} />} {date.displayDate}{" "}
          {displayName}
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
            placeholder="Observações sobre água..."
          />
        </MyView>

        <MyView className=" flex-row flex-wrap justify-center items-center gap-[1rem]">
          <MyView
            className="min-w-1/2 w-full h-fit rounded-md flex-row gap-[1rem] justify-center items-start"
            style={[
              styles.card,
              {
                width: "50%",
                height: "fit",
                justifyContent: "center",
                alignItems: "center",
                flexGrow: 1,
                display: "flex",
                flexDirection: "row",
              },
            ]}
          >
            <Text
              style={styles.title}
              className="text-white font-bold text-[1.6rem]"
            >
              {displayName} hoje
            </Text>
            <TextInput
              className="max-w-[2.4rem] w-fit text-center bg-[#333333] h-[2.3rem] px-1 text-[1.2rem] font-regular text-white rounded-md shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
              placeholder="--"
              value={sleepHours}
              onChangeText={(value) => setSleepHours(value)}
            />
            <Text style={styles.title}>h</Text>
            <TextInput
              className="max-w-[2.4rem] text-center w-fit bg-[#333333] h-[2.3rem] px-1 text-[1.2rem] font-regular text-white rounded-md shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
              placeholder="--"
              value={sleepMinutes}
              onChangeText={(value) => setSleepMinutes(value)}
            />
            <Text style={styles.title}>min</Text>
          </MyView>
          <MyButton
            style={{ height: "fit-content" }}
            title="Salvar"
            onPress={() => handleSubmit()}
          />
        </MyView>
      </MyView>
      <History tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
