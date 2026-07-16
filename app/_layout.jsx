// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { Stack } from "expo-router";
import { useColorScheme, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useRegistrosPersistencia } from "@/infra/persistence";
import UpdateBanner from "@/components/UpdateBanner";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  useRegistrosPersistencia();

  return (
    <SafeAreaProvider>
      {/* View de raiz só pra ancorar o UpdateBanner sobre a rota atual. */}
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Hoje" }} />
          <Stack.Screen name="roadmap" options={{ title: "Roadmap" }} />
          <Stack.Screen name="export" options={{ title: "Exportação" }} />
          <Stack.Screen name="history" options={{ title: "Histórico" }} />
          <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
          {/* Rota de admin (testers) — acesso só por deep link backontrack://admin */}
          <Stack.Screen name="admin" options={{ title: "Admin" }} />
          <Stack.Screen name="(metrics)" />
        </Stack>
        <UpdateBanner />
      </View>
    </SafeAreaProvider>
  );
}
