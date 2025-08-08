import { Text, View, useColorScheme } from "react-native";
import { Colors } from "../constants/Colors";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Text
          style={{ color: theme.text }}
          className="text-[4rem] font-bold text-center"
        >
          Esse pedacinho de tecnologia está em construção!
        </Text>
      </View>
    </>
  );
}
