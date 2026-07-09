// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useLocalSearchParams, usePathname } from "expo-router";

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import { Colors } from "@/constants/Colors";

import MyHistory from "@/components/MyHistory";
import MyButton from "@/components/MyButton";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add, getById, update } from "@/infra/database";
import { useThemedStyles } from "@/hook/useThemedStyle";

//#endregion

export default function Water() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, unit } = getCategoryInfo(pathname) ?? {};
  const { id } = useLocalSearchParams();

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

  //#region edição
  useEffect(() => {
    if (!id) return;
    const r = getById(id);
    if (!r) return;
    setQuantity(String(r.quantity ?? ""));
    setObservation(r.note ?? r.observation ?? "");
    setMin(r.min ?? "");
    setMax(r.max ?? "");
    setIdeal(r.ideal ?? "");
    setScore(r.score);
  }, [id]);
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
      padding: 16,
      gap: 16,
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
      quantity: Number(quantity) || 0,
      unit,
      note: observation,
      min,
      max,
      ideal,
      score,
    };
    if (id) update(id, data);
    else add("water", data);
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
          onPress: onDismissSnackBar,
        }}
      >
        Registro salvo!
      </Snackbar>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{
          alignItems: "center",
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MyView style={styles.card}>
          <Text style={styles.title}>
            {date.displayDate} {displayName}
          </Text>

          {/* card Wrapper */}
          <MyView style={styles.cardWrapper}>
            {/* Input Wrapper */}
            <MyView style={styles.inputWrapper}>
              <Text style={styles.title}>MIN</Text>
              <TextInput
                style={styles.input}
                placeholder="--"
                value={min}
                onChangeText={(value) => setMin(value)}
              />
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
          {/* OBS */}
          <MyView className="gap-1">
            <Text style={styles.title}>OBS:</Text>
            <TextInput
              value={observation}
              onChangeText={(value) => setObservation(value)}
              style={styles.textArea}
              placeholder="Observações sobre água..."
            />
          </MyView>

          <MyView className="flex-row flex-wrap gap-4 items-center">
            <MyView
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
                style={[
                  styles.input,
                  {
                    backgroundColor: "#333",
                    width: 80,
                    height: 51,
                    textAlign: "center",
                  },
                ]}
                placeholder="--"
                value={quantity}
                onChangeText={(value) => setQuantity(value)}
              />
              <Text style={styles.title}>ml</Text>
            </MyView>
            <MyButton title="Salvar" onPress={() => handleSubmit()} />
          </MyView>
        </MyView>
        <MyHistory tableName={pathname} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
