// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MyView from "@/components/MyView";

import { supabase } from "@/infra/supabase";
import { useThemeTokens } from "@/constants/themeTokens";

// Callback do magic link do Supabase (M6 auth fatia A, #207, ADR-010).
// Deep link `backontrack://auth/callback?code=...` (native) OU
// `https://<host>/auth/callback?code=...` (web) cai aqui — troca o code por
// sessão via PKCE, redireciona pra /.

export default function AuthCallback() {
  const t = useThemeTokens();
  const { code, error, error_description } = useLocalSearchParams();
  const [status, setStatus] = useState("exchanging");

  useEffect(() => {
    // Supabase pode redirecionar com `?error=...` em vez de `?code=...`
    // (ex: link expirado, config errada) — vira status error; detalhe fica
    // no console pra debug sem vazar shape do backend pro usuário.
    if (error) {
      console.error("[callback] supabase error:", error, error_description);
      setStatus("error");
      return;
    }
    if (!supabase) {
      console.error("[callback] supabase não configurado");
      setStatus("error");
      return;
    }
    // Caminho A (PKCE): magic link veio com `?code=` — troca por sessão.
    if (code) {
      supabase.auth
        .exchangeCodeForSession(String(code))
        .then(({ error: exchangeErr }) => {
          if (exchangeErr) throw exchangeErr;
          router.replace("/");
        })
        .catch((e) => {
          console.error("[callback] exchangeCodeForSession falhou:", e);
          setStatus("error");
        });
      return;
    }
    // Caminho B (implícito, `#access_token=...`): o client parseia sozinho na
    // init (detectSessionInUrl no web). Ouve o próximo evento de auth; se cair
    // com sessão em até 3s, redireciona. Senão, o link mesmo era ruim.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        clearTimeout(timeoutId);
        sub.subscription.unsubscribe();
        router.replace("/");
      }
    });
    const timeoutId = setTimeout(() => {
      sub.subscription.unsubscribe();
      console.error("[callback] timeout esperando sessão (hash-flow)");
      setStatus("error");
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [code, error, error_description]);

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 20,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        {status === "exchanging" ? (
          <View className="items-center gap-4">
            <ActivityIndicator color={t.primary} />
            <Text
              className="text-base text-body-secondary dark:text-body-secondary-dark"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Autenticando…
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5">
              <Text
                className="text-lg text-ink dark:text-ink-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Não deu certo
              </Text>
              <Text
                className="text-sm text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                O link pode ter expirado ou já foi usado. Peça um novo pela tela
                de entrar.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar de novo"
              onPress={() => router.replace("/login")}
              className="items-center rounded-2xl bg-primary dark:bg-primary-dark py-4 active:opacity-70"
            >
              <Text
                className="text-base text-white dark:text-on-primary-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </MyView>
  );
}
