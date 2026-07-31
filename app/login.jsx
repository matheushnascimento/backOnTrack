// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import * as Linking from "expo-linking";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";

import MyView from "@/components/MyView";
import MyButton from "@/components/MyButton";
import MyInput from "@/components/MyInput";
import Card from "@/components/Card";

import { useSession } from "@/infra/session";
import { AUTH_ENABLED, supabase } from "@/infra/supabase";

// Login por magic link (M6 auth fatia A, #207, ADR-010).
// Sync continua anônimo por baixo — só a fatia B passa a usar o JWT.

export default function Login() {
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const canSend = AUTH_ENABLED && status !== "sending" && email.includes("@");

  async function handleSend() {
    if (!canSend || !supabase) return;
    setStatus("sending");
    try {
      // Linking.createURL cobre native (backontrack://) e web (https://origin).
      // Ambos precisam estar no allowlist de Redirect URLs do Supabase.
      const emailRedirectTo = Linking.createURL("/auth/callback");
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (e) {
      // Detalhes técnicos ficam no console — UI mostra só mensagem genérica.
      // "Invalid API key", HTTP status, stack trace: infra interna que só
      // atrapalha usuário final e pode vazar shape do backend.
      console.error("[login] signInWithOtp falhou:", e);
      setStatus("error");
    }
  }

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        {!AUTH_ENABLED ? (
          <Card className="gap-2">
            <Text className="font-bold text-xl text-light-text dark:text-dark-text">
              Login indisponível
            </Text>
            <Text className="text-base text-light-text opacity-70 dark:text-dark-text">
              O app não foi configurado com credenciais do Supabase
              (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). Isso é
              esperado enquanto a fatia A do M6 auth não sobe pra você.
            </Text>
          </Card>
        ) : user ? (
          <Card className="gap-3">
            <Text className="font-bold text-xl text-light-text dark:text-dark-text">
              Já está logado
            </Text>
            <Text className="text-base text-light-text opacity-70 dark:text-dark-text">
              {user.email}
            </Text>
            <MyButton
              title="Voltar ao início"
              onPress={() => router.navigate("/")}
            />
          </Card>
        ) : status === "sent" ? (
          <Card className="gap-3">
            <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
              Verifique seu email 📬
            </Text>
            <Text className="text-base text-light-text opacity-70 dark:text-dark-text">
              Enviamos um link mágico pra {email}. Toque no link do email pra
              entrar — o app abre logado sozinho.
            </Text>
            <MyButton
              title="Não recebi, enviar de novo"
              onPress={() => setStatus("idle")}
            />
          </Card>
        ) : (
          <Card className="gap-4">
            <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
              Entrar
            </Text>
            <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
              Sem senha: mandamos um link pro seu email; abrindo o link, você
              entra.
            </Text>

            <MyInput
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              containerClassName="w-full"
              className="w-full"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />

            {status === "error" && (
              <Text className="text-sm text-danger">
                Não consegui enviar o link agora. Confere o email e tenta de
                novo em alguns minutos.
              </Text>
            )}

            <MyButton
              title={status === "sending" ? "Enviando…" : "Enviar magic link"}
              onPress={handleSend}
              disabled={!canSend}
            />
          </Card>
        )}
      </ScrollView>
    </MyView>
  );
}
