// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import * as Linking from "expo-linking";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";

import { useSession } from "@/infra/session";
import { AUTH_ENABLED, supabase } from "@/infra/supabase";
import { useThemeTokens } from "@/constants/themeTokens";

// Login por magic link (M6 auth fatia A, #207, ADR-010).
// Sync continua anônimo por baixo — só a fatia B passa a usar o JWT.

export default function Login() {
  const t = useThemeTokens();
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
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav: back */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => goBack()}
            className="flex-row items-center gap-1 rounded-full p-1 pr-2 active:opacity-70"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={t.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text
              className="text-base text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Voltar
            </Text>
          </Pressable>
        </View>

        {!AUTH_ENABLED ? (
          <SoftMessage
            title="Login indisponível"
            body="O app não foi configurado com credenciais do Supabase. Isso é esperado enquanto a fatia A do M6 auth não sobe pra você."
          />
        ) : user ? (
          <View className="gap-4">
            <SoftMessage title="Já está logado" body={user.email} bodyMono />
            <PrimaryAction
              label="Voltar ao início"
              onPress={() => router.navigate("/")}
            />
          </View>
        ) : status === "sent" ? (
          <View className="gap-4">
            <SoftMessage
              title="Verifique seu email 📬"
              body={`Enviamos um link mágico pra ${email}. Toque no link do email pra entrar — o app abre logado sozinho.`}
            />
            <SecondaryAction
              label="Não recebi, enviar de novo"
              onPress={() => setStatus("idle")}
            />
          </View>
        ) : (
          <View className="gap-5">
            <View className="gap-1 px-1">
              <Text
                className="text-2xl text-ink dark:text-ink-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Entrar
              </Text>
              <Text
                className="text-sm text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
              >
                Sem senha: mandamos um link pro seu email; abrindo o link, você
                entra.
              </Text>
            </View>

            <View>
              <Text
                className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={t.iconDim}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                accessibilityLabel="Email"
                className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4"
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: t.ink,
                  paddingVertical: 14,
                }}
              />
            </View>

            {status === "error" && (
              <Text
                className="text-sm text-danger"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Não consegui enviar o link agora. Confere o email e tenta de
                novo em alguns minutos.
              </Text>
            )}

            <PrimaryAction
              label={status === "sending" ? "Enviando…" : "Enviar magic link"}
              onPress={handleSend}
              disabled={!canSend}
            />
          </View>
        )}
      </ScrollView>
    </MyView>
  );
}

/** @param {{ title: string, body: string, bodyMono?: boolean }} props */
function SoftMessage({ title, body, bodyMono }) {
  return (
    <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5">
      <Text
        className="text-lg text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {title}
      </Text>
      <Text
        className="text-sm text-body-secondary dark:text-body-secondary-dark"
        style={{
          fontFamily: bodyMono
            ? "JetBrainsMono_400Regular"
            : "Inter_400Regular",
        }}
      >
        {body}
      </Text>
    </View>
  );
}

/** @param {{ label: string, onPress: () => void, disabled?: boolean }} props */
function PrimaryAction({ label, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-2xl py-4 ${
        disabled
          ? "bg-border-strong dark:bg-border-strong-dark"
          : "bg-primary dark:bg-primary-dark active:opacity-70"
      }`}
    >
      <Text
        className="text-base text-white dark:text-on-primary-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** @param {{ label: string, onPress: () => void }} props */
function SecondaryAction({ label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center rounded-2xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark py-4 active:opacity-70"
    >
      <Text
        className="text-base text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
