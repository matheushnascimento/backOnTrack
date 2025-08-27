import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { StatusBar } from "expo-status-bar";
import MyHeader from "@/components/MyHeader";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <StatusBar />
      <MyHeader />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Home",
          }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: false, title: "Histórico" }}
        />
        <Stack.Screen
          name="export"
          options={{ headerShown: false, title: "Exportação" }}
        />
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
      </Stack>
    </>
  );
}
