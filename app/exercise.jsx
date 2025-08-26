//#region imports
import { usePathname } from "expo-router";

import { useState } from "react";
import { Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import { Droplet } from "lucide-react-native";

import { Colors } from "@/constants/Colors";

import History from "@/components/History";
import MyButton from "@/components/MyButton";
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
  const { displayName, Icon } = getCategoryInfo(pathname);

  //#region states
  const [date, setDate] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [quantity, setQuantity] = useState();
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
      padding: "1rem",
      gap: "1rem",
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
      quantity,
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
          {Icon && <Icon size={24} color={Colors.primary} />} {date.displayDate}{" "}
          {displayName}
        </Text>

        {/* card Wrapper */}
        <MyView style={styles.cardWrapper}></MyView>

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

        <MyView className="flex-row flex-wrap gap-[1rem] items-center">
          <MyButton
            style={{ height: "fit-content" }}
            title="Salvar"
            onPress={() => handleSubmit()}
          />
        </MyView>
      </MyView>
    </MyView>
  );
}
