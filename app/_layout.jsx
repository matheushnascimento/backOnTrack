import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { useRegistrosPersistencia } from "@/infra/persistence";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  useRegistrosPersistencia();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="export" options={{ title: "Exportação" }} />
      <Stack.Screen name="(history)" />
      <Stack.Screen name="(metrics)" />
    </Stack>
  );
}
