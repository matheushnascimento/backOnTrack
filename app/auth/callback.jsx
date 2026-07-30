// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MyView from "@/components/MyView";
import MyButton from "@/components/MyButton";
import Card from "@/components/Card";

import { supabase } from "@/infra/supabase";

// Callback do magic link do Supabase (M6 auth fatia A, #207, ADR-010).
// Deep link `backontrack://auth/callback?code=...` (native) OU
// `https://<host>/auth/callback?code=...` (web) cai aqui — troca o code por
// sessão via PKCE, redireciona pra /.

export default function AuthCallback() {
  const { code, error, error_description } = useLocalSearchParams();
  const [status, setStatus] = useState("exchanging");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Supabase pode redirecionar com `?error=...` em vez de `?code=...`
    // (ex: link expirado, config errada) — surface direto.
    if (error) {
      setErrorMsg(String(error_description ?? error));
      setStatus("error");
      return;
    }
    if (!code || !supabase) {
      setErrorMsg("Link inválido ou sem código de autenticação.");
      setStatus("error");
      return;
    }
    supabase.auth
      .exchangeCodeForSession(String(code))
      .then(({ error: exchangeErr }) => {
        if (exchangeErr) throw exchangeErr;
        // SessionProvider vai pegar via onAuthStateChange — só voltar pra home.
        router.replace("/");
      })
      .catch((e) => {
        setErrorMsg(String(e?.message ?? e));
        setStatus("error");
      });
  }, [code, error, error_description]);

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
      >
        {status === "exchanging" ? (
          <Card className="gap-3 items-center">
            <ActivityIndicator />
            <Text className="text-base text-light-text dark:text-dark-text">
              Autenticando…
            </Text>
          </Card>
        ) : (
          <Card className="gap-3">
            <Text className="font-bold text-xl text-light-text dark:text-dark-text">
              Não deu certo
            </Text>
            <Text className="text-sm text-danger">{errorMsg}</Text>
            <MyButton
              title="Tentar de novo"
              onPress={() => router.replace("/login")}
            />
          </Card>
        )}
      </ScrollView>
    </MyView>
  );
}
