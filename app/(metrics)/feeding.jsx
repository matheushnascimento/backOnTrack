//#region imports
import { usePathname } from "expo-router";

import { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import { Colors } from "@/constants/Colors";
import MyButton from "@/components/MyButton";
import { MyIconButton } from "@/components/MyButton";
import MyHistory from "@/components/MyHistory";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add } from "@/infra/database";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Feeding() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName } = getCategoryInfo(pathname);

  //#region states
  const [date] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [visible, setVisible] = useState(false);
  //#endregion

  const styles = useThemedStyles((theme) => ({
    card: {
      overflow: "hidden",
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
      score,
      observation,
      quantity,
    };
    add("feeding", data);
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
          <MyView className="flex-row gap-5">
            {Array.from({ length: quantity }).map((_, index) => (
              <MyIconButton
                key={index}
                value={index}
                compact="true"
                // style={styles.button}
                // titleStyle={styles.title}
                isSelected={true}
                onPress={() => setQuantity(quantity - 1)}
              />
            ))}
            <MyIconButton
              onPress={() => setQuantity(quantity + 1)}
              compact="true"
            />
          </MyView>
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
            placeholder="Observações sobre refeições..."
          />
        </MyView>

        <MyButton title="Salvar" onPress={() => handleSubmit()} />
      </MyView>
      <MyHistory tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
