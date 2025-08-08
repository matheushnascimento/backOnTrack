import { Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { useColorScheme } from "react-native";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Hello World!</Text>
      </View>
    </>
  );
}
