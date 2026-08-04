// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";

import { useRegistrosPersistencia } from "@/infra/persistence";
import { SessionProvider } from "@/infra/session";
import { useRegistrosSync } from "@/infra/sync";
import UpdateBanner from "@/components/UpdateBanner";

export default function RootLayout() {
  useRegistrosPersistencia();
  // Fontes do design v2 (M5-B fatia 0). Carrega em background; se ainda não
  // tiver terminado, sistema serve o fallback e a UI re-renderiza quando
  // ficarem prontas. Não bloqueia boot pra não introduzir splash extra —
  // fatia 1+ é que começa a usar essas famílias. Ver docs/09-design-v2.md.
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

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
        <Stack.Screen name="roadmap" options={{ title: "Roadmap" }} />
        <Stack.Screen name="export" options={{ title: "Exportação" }} />
        <Stack.Screen name="history" options={{ title: "Histórico" }} />
        <Stack.Screen name="semana" options={{ title: "Semana" }} />
        <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
        <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
        {/* Rota de admin (testers) — acesso só por deep link backontrack://admin */}
        <Stack.Screen name="admin" options={{ title: "Admin" }} />
        <Stack.Screen name="login" options={{ title: "Entrar" }} />
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
