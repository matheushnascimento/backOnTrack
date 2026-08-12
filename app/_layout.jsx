// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import "@/global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
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
import { SyncStatusProvider } from "@/infra/sync";
import { useRestoreThemePreference } from "@/infra/theme";
import UpdateBanner from "@/components/UpdateBanner";

// Segura o splash nativo até as fontes carregarem. Fora do componente porque
// precisa rodar UMA vez, antes do primeiro render.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Já escondido ou indisponível (web/dev) — seguir sem travar o boot.
});

export default function RootLayout() {
  useRegistrosPersistencia();
  // Restaura claro/escuro escolhido em Ajustes. Sem isso o toggle só valia
  // até o próximo reload (o NativeWind guarda em memória). Ver infra/theme.js.
  useRestoreThemePreference();

  // ⚠️ O retorno do useFonts NÃO pode ser descartado.
  //
  // Antes ele era, com a justificativa de "não bloquear o boot". O custo
  // apareceu como bug de renderização recorrente no Android: a UI montava com
  // a fonte de fallback do sistema, o Android MEDIA o texto com ela, e quando
  // a Inter terminava de carregar o glifo real vinha mais largo que a caixa já
  // dimensionada — a última letra cortava ("Depois" virava "Depoi").
  //
  // Foi diagnosticado errado três vezes (#239 fontWeight+letterSpacing, #249
  // underline, #268 flex): cada patch mexia num sintoma diferente da mesma
  // corrida. A causa é uma só, e é aqui.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Erro de fonte não pode deixar o app preso no splash pra sempre — nesse
  // caso segue com o fallback do sistema, que é degradação aceitável.
  const pronto = fontsLoaded || !!fontError;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);

  // Nada de árvore antes da fonte existir: é isso que garante que a primeira
  // medição de texto já use a métrica definitiva.
  if (!pronto) return null;

  return (
    <SafeAreaProvider>
      {/* SessionProvider envolve tudo (M6 auth fatia A, #207) — expõe a
          sessão do Supabase pros filhos via useSession. O SyncStatusProvider
          precisa vir por DENTRO dele: roda useRegistrosSync, que chama
          useSession por baixo — acima do provider receberia o default do
          contexto (user: null) e o sync nunca sairia da sala anônima após
          login (bug do #217). */}
      <SessionProvider>
        <SyncStatusProvider>
          <AppTree />
        </SyncStatusProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function AppTree() {
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
        {/* Aberta pelo hamburger (canto esquerdo) — entra da esquerda pra
            casar com o ícone, em vez do slide-from-right padrão de "avançar
            no conteúdo" que as outras telas usam. */}
        <Stack.Screen
          name="ajustes"
          options={{ title: "Ajustes", animation: "slide_from_left" }}
        />
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
