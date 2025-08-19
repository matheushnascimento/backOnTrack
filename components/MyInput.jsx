import { Colors } from "@/constants/Colors";
import { Text, TextInput, useColorScheme, View } from "react-native";
import MyView from "./MyView";

export default function MyInput({ label }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.dark;
  return (
    <MyView className="w-[33%] flex">
      <Text style={{ color: "white" }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: theme.backgroundCard }}
        keyboardType="numeric"
        placeholder="--"
        className="w-24 h-[2rem] p-2 text-white shadow rounded-[6px]"
      />
    </MyView>
  );
}
