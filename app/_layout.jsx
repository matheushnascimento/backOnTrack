// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRegistrosPersistencia } from "@/infra/persistence";
import { SessionProvider } from "@/infra/session";
import { useRegistrosSync } from "@/infra/sync";
import UpdateBanner from "@/components/UpdateBanner";

export default function RootLayout() {
  useRegistrosPersistencia();

  return (
    <SafeAreaProvider>
      {/* SessionProvider envolve tudo (M6 auth fatia A, #207) — expõe a
          sessão do Supabase pros filhos via useSession. useRegistrosSync
          precisa vir por DENTRO do provider senão useSession retorna o
          default do contexto (user: null) e o sync nunca sai da sala
          anônima após login. */}
      <SessionProvider>
        <AppTree />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

// Filho do SessionProvider — usa `useSession` via useRegistrosSync.
function AppTree() {
  // Sync depende do syncRoomId (carregado por useRegistrosPersistencia no
  // root) E da session — deve rodar DENTRO do SessionProvider.
  useRegistrosSync();

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Hoje" }} />
        {/* Roadmap/Feedback/Admin não têm relação com registro de métrica,
            então não usam o MyHeader (faixa de chips). Ativam o header
            nativo do Expo Router pra ganhar título + back arrow (#178). */}
        <Stack.Screen
          name="roadmap"
          options={{ title: "Roadmap", headerShown: true }}
        />
        <Stack.Screen name="export" options={{ title: "Exportação" }} />
        <Stack.Screen name="history" options={{ title: "Histórico" }} />
        <Stack.Screen
          name="feedback"
          options={{ title: "Feedback", headerShown: true }}
        />
        {/* Rota de admin (testers) — acesso só por deep link backontrack://admin */}
        <Stack.Screen
          name="admin"
          options={{ title: "Admin", headerShown: true }}
        />
        <Stack.Screen
          name="login"
          options={{ title: "Entrar", headerShown: true }}
        />
        {/* Callback do magic link — headless, autopropulsão pra /. */}
        <Stack.Screen
          name="auth/callback"
          options={{ title: "Autenticando", headerShown: false }}
        />
        <Stack.Screen name="(metrics)" />
      </Stack>
      <UpdateBanner />
    </View>
  );
}
