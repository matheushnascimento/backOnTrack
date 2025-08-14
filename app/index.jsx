import {
  Button,
  Image,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Colors } from "../constants/Colors";
import image from "../assets/trecho-em-obras.png";
import { useEffect, useState } from "react";
import { get, add } from "@/infra/database";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [description, setDescription] = useState("");

  useEffect(() => {
    get();
  }, []);

  function handleDescription() {
    const date = new Date();
    add("water", { ml: 400, date: date.toISOString() });
  }
  return (
    <>
      <View
        className="flex-1 items-center"
        style={{ backgroundColor: theme.background }}
      >
        <Image source={image} />

        <TextInput
          style={styles.input}
          placeholder="O que você quer adicionar?"
          onChangeText={setDescription}
          value={description}
        />

        <Button title="Adicionar" onPress={handleDescription} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 50,
    backgroundColor: "white",
    borderRadius: 8,
    border: "2px solid black",
    padding: 12,
  },
});
