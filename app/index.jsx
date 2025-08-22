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

//#endregion

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [date, setDate] = useState(getDate());
  const [ideal, setIdeal] = useState();
  const [score, setScore] = useState(null);
  const [min, setMin] = useState();
  const [max, setMax] = useState();
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState();

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

  function getDate() {
    const date = new Date();
    const displayDate = `${date.getDay()}/${date.getMonth()}/${date.getFullYear()}`;
    return { date: date.toISOString(), displayDate };
  }
  function handleSubmit() {
    const data = {
      date,
      min,
      max,
      ideal,
      quantity,
      score,
      observation,
    };
    add("water", data);
  }
  useEffect(() => {}, []);

  return (
    <MyView
      safe={true}
      className="flex-1 gap-3 p-5"
      style={{ backgroundColor: theme.background }}
    >
      <Header />
      <MyView
        style={{ backgroundColor: theme.backgroundCard, padding: 10 }}
        className="rounded-md gap-5 shadow-[0_.4rem_.4rem_0_rgba(0,0,0,.25)]"
      >
        <Text style={styles.title} className="flex flex-row gap-1">
          <Droplet color={Colors.primary} />
          {date.displayDate} água
        </Text>

        {/* card Wrapper */}
        <MyView className="flex-row justify-between">
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
        <MyView className="flex-row gap-[1rem]">
          <MyView
            className="min-w-1/2 w-fit h-fit rounded-md flex-row gap-[1rem] justify-center items-start"
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
          <MyButton title="Salvar" onPress={() => handleSubmit()} />
        </MyView>
      </MyView>
    </MyView>
  );
}
