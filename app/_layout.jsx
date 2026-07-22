// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRegistrosPersistencia } from "@/infra/persistence";
import UpdateBanner from "@/components/UpdateBanner";

export default function RootLayout() {
  useRegistrosPersistencia();

  return (
    <SafeAreaProvider>
      {/* View de raiz só pra ancorar o UpdateBanner sobre a rota atual. */}
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }}>
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
