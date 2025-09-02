import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import MyHeader from "@/components/MyHeader";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <MyHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      >
        <Stack.Screen
          name="water"
          options={{ headerShown: false, title: "Água" }}
        />
        <Stack.Screen
          name="sleep"
          options={{ headerShown: false, title: "Sono" }}
        />
        <Stack.Screen
          name="exercise"
          options={{ headerShown: false, title: "Exercícios" }}
        />
        <Stack.Screen
          name="feeding"
          options={{ headerShown: false, title: "Alimentação" }}
        />
        <Stack.Screen
          name="study"
          options={{ headerShown: false, title: "Estudo" }}
        />
      </Stack>
    </>
  );
}
