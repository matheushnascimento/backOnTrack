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

export default function Water() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, Icon } = getCategoryInfo(pathname);

  //#region states
  const [date, setDate] = useState(getDate());
  const [ideal, setIdeal] = useState();
  const [score, setScore] = useState();
  const [min, setMin] = useState();
  const [max, setMax] = useState();
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
    container: {
      flex: 1,
      alignItems: "center",
      gap: "1rem",
      backgroundColor: theme.background,
    },
    input: {
      padding: ".4rem",
      fontSize: "1.6rem",
      fontWeight: "bold",
      maxWidth: "10rem",
      color: theme.text,
      borderRadius: ".6rem",
      boxShadow: Colors.shadow,
      backgroundColor: theme.backgroundCard,
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
    text: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
    title: {
      width: "fit",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
  }));
  //#endregion

  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      min,
      max,
      ideal,
      quantity,
      score,
      observation,
    };
    add("water", data);
    setReloadKey((prev) => prev + 1);
  }
  function onDismissSnackBar() {
    setVisible(false);
  }

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
        <Text style={styles.title} className="flex flex-row gap-1">
          <Droplet color={Colors.primary} />
          {Icon && <Icon size={24} color={Colors.primary} />} {date.displayDate}{" "}
          {displayName}
        </Text>

        {/* card Wrapper */}
        <MyView className=" flex-row flex-wrap justify-between">
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>MIN</Text>
            <TextInput
              style={styles.input}
              placeholder="--"
              value={min}
              onChangeText={(value) => setMin(value)}
            />
          </MyView>
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>MAX</Text>
            <TextInput
              style={styles.input}
              placeholder="--"
              value={max}
              onChangeText={(value) => setMax(value)}
            />
          </MyView>
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>IDEAL</Text>
            <TextInput
              style={styles.input}
              placeholder="--"
              value={ideal}
              onChangeText={(value) => setIdeal(value)}
            />
          </MyView>
        </MyView>

        <Text style={styles.title}>Nota</Text>
        <Score value={score} onPress={setScore} />

        <MyView className=" gap-1">
          <Text style={styles.title}>OBS:</Text>
          <TextInput
            value={observation}
            onChangeText={(value) => setObservation(value)}
            style={styles.textArea}
            placeholder="Observações sobre água..."
          />
        </MyView>
        <MyView className="flex-row flex-wrap justify-center gap-[1rem]">
          <MyView
            className="min-w-1/2 w-full h-fit rounded-md flex-row gap-[1rem]  items-center"
            style={{
              padding: 10,
            }}
          >
            <Text
              style={styles.title}
              className=" text-white font-bold text-[1.6rem]"
            >
              {displayName} hoje
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: "#333", height: "3.2rem" },
              ]}
              placeholder="--"
              value={quantity}
              onChangeText={(value) => setQuantity(value)}
            />
            <Text style={styles.title}>ml</Text>
          </MyView>
          <MyButton
            style={{ width: "100%" }}
            title="Salvar"
            onPress={() => handleSubmit()}
          />
        </MyView>
      </MyView>
      <History tableName={pathname} reload={reloadKey} />
    </MyView>
  );
}
