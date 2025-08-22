import { Colors } from "@/constants/Colors";
import { Text, TextInput, useColorScheme, View } from "react-native";
import MyView from "./MyView";

export default function MyInput({
  className,
  label,
  placeholder = "--",
  style,
  ...props
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return <MyView className="w-fit"></MyView>;
}
