import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "Home" }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: false, title: "Histórico" }}
        />
        <Stack.Screen
          name="export"
          options={{ headerShown: false, title: "Exportação" }}
        />
      </Stack>
    </>
  );
}
