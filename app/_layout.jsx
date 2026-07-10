// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useRegistrosPersistencia } from "@/infra/persistence";
import { useOtaUpdate } from "@/hooks/useOtaUpdate";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  useRegistrosPersistencia();
  useOtaUpdate();

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
