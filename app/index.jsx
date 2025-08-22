//#region imports
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, useColorScheme } from "react-native";

import { Droplet } from "lucide-react-native";

import { Colors } from "@/constants/Colors";

import Header from "@/components/MyHeader";
import MyView from "@/components/MyView";
import Score from "@/components/Score";
import MyButton from "@/components/MyButton";

import { add } from "@/infra/database";
import History from "@/components/History";

//#endregion

export default function Home() {
  //#region variables
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  //#region states
  const [date, setDate] = useState(getDate());
  const [ideal, setIdeal] = useState();
  const [score, setScore] = useState();
  const [min, setMin] = useState();
  const [max, setMax] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [quantity, setQuantity] = useState();
  //#endregion

  const styles = StyleSheet.create({
    title: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
      width: "fit",
    },

    text: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 18,
    },
  });
  //#endregion

  function getDate() {
    const date = new Date();
    const displayDate = `${date.getDay()}/${date.getMonth()}/${date.getFullYear()}`;
    return { ISOdate: date.toISOString(), displayDate };
  }
  function handleSubmit() {
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
    alert("Atualizado!");
  }

  return (
    <MyView
      safe={true}
      className="flex-1 items-center gap-3 p-5"
      style={{ backgroundColor: theme.background }}
    >
      <Header />
      <MyView
        style={{ backgroundColor: theme.backgroundCard, padding: 10 }}
        className="flex max-w-[40rem] rounded-md gap-5 shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
      >
        <Text style={styles.title} className="flex flex-row gap-1">
          <Droplet color={Colors.primary} />
          {date.displayDate} água
        </Text>

        {/* card Wrapper */}
        <MyView className="flex-row flex-wrap justify-between">
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>MIN</Text>
            <TextInput
              style={{
                backgroundColor: theme.backgroundCard,
              }}
              className="px-1 text-[1.6rem] font-bold text-white rounded-md max-w-[10rem] shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
              placeholder="--"
              value={min}
              onChangeText={(value) => setMin(value)}
            />
          </MyView>
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>MAX</Text>
            <TextInput
              style={{
                backgroundColor: theme.backgroundCard,
              }}
              className="px-1 text-[1.6rem] font-bold text-white rounded-md max-w-[10rem] shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
              placeholder="--"
              value={max}
              onChangeText={(value) => setMax(value)}
            />
          </MyView>
          {/* Input Wrapper */}
          <MyView className="w-fit gap-[.6rem]">
            <Text style={styles.title}>IDEAL</Text>
            <TextInput
              style={{
                backgroundColor: theme.backgroundCard,
              }}
              className="px-1 text-[1.6rem] font-bold text-white rounded-md max-w-[10rem] shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
              placeholder="--"
              value={ideal}
              onChangeText={(value) => setIdeal(value)}
            />
          </MyView>
        </MyView>

        <Text style={styles.title}>Nota</Text>
        <Score value={score} onPress={setScore} />

        <Text style={styles.title}>OBS:</Text>
        <TextInput
          value={observation}
          onChangeText={(value) => setObservation(value)}
          style={{
            backgroundColor: theme.backgroundCard,
          }}
          className="h-[4rem] px-1 text-[1.2rem] font-regular text-white rounded-md shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]
          placeholder:opacity-50"
          placeholder="Observações sobre água..."
        />
        <MyView className="flex-row flex-wrap justify-center gap-[1rem]">
          <MyView
            className="min-w-1/2 w-full h-fit rounded-md flex-row gap-[1rem] justify-center items-start"
            style={{
              padding: 10,
              backgroundColor: theme.backgroundCard,
            }}
          >
            <Text
              style={styles.title}
              className=" text-white font-bold text-[1.6rem]"
            >
              água hoje
            </Text>
            <TextInput
              className="max-w-[10rem] w-fit bg-[#333333] h-[2.3rem] px-1 text-[1.2rem] font-regular text-white rounded-md shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
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
      <History tableName="water" reload={reloadKey} />
    </MyView>
  );
}
