// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import * as Linking from "expo-linking";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { goBack } from "@/constants/navigation";
import { codigoCompleto, limparCodigo, OTP_MAX } from "@/constants/otp";
import MyView from "@/components/MyView";

import { useSession } from "@/infra/session";
import { AUTH_ENABLED, supabase } from "@/infra/supabase";
import { useThemeTokens } from "@/constants/themeTokens";

// Login por e-mail sem senha (M6 auth fatia A, #207, ADR-010).
//
// O e-mail traz um link E um código (#376). O link sozinho falhava quando
// abria num navegador diferente do que pediu: o fluxo PKCE guarda uma chave no
// navegador que pediu, e só ele troca o link pela sessão. No iPhone isso é
// comum, porque o Gmail abre o link no Safari e o pedido pode ter saído do app
// da tela inicial, que tem armazenamento próprio. O código é digitado aqui, no
// mesmo lugar que pediu, e não depende de onde o link abre.
//
// ⚠️ O código só existe se os modelos "Magic Link" e "Confirm signup" do
// Supabase incluírem `{{ .Token }}`. Sem isso o e-mail chega só com o link.

export default function Login() {
  const t = useThemeTokens();
  const { user } = useSession();
  const [email, setEmail] = useState("");
  // idle | sending | sent | error, e no passo do código: verifying | codeError
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");

  const canSend = AUTH_ENABLED && status !== "sending" && email.includes("@");
  const canVerify = status !== "verifying" && codigoCompleto(code);

  async function handleVerify() {
    if (!canVerify || !supabase) return;
    setStatus("verifying");
    try {
      // `email` cobre os dois modelos: o de quem já tem conta (Magic Link) e o
      // do primeiro acesso (Confirm signup).
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (error) throw error;
      // A sessão chega pelo onAuthStateChange do SessionProvider. `replace`,
      // como no callback do link, pra o voltar não cair de novo aqui.
      router.replace("/");
    } catch (e) {
      // O Supabase responde igual pra código errado e vencido, então a
      // mensagem cobre os dois.
      console.error("[login] verifyOtp falhou:", e);
      setStatus("codeError");
    }
  }

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
      setCode("");
      setStatus("sent");
    } catch (e) {
      // Detalhes técnicos ficam no console, e a UI mostra só mensagem genérica.
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
        ) : ["sent", "verifying", "codeError"].includes(status) ? (
          <View className="gap-4">
            <SoftMessage
              title="Verifique seu email 📬"
              body={`Enviamos um código pra ${email}. Digite aqui, ou toque no link do email.`}
            />

            <View>
              <Text
                className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                Código
              </Text>
              {/* `oneTimeCode` deixa o iOS sugerir o código vindo do Mail em
                  cima do teclado. No Android o equivalente é o autoComplete. */}
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(limparCodigo(v));
                  if (status === "codeError") setStatus("sent");
                }}
                placeholder="000000"
                placeholderTextColor={t.iconDim}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={OTP_MAX}
                accessibilityLabel="Código do email"
                className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4"
                style={{
                  fontFamily: "JetBrainsMono_500Medium",
                  fontSize: 22,
                  letterSpacing: 4,
                  color: t.ink,
                  paddingVertical: 12,
                }}
              />
            </View>

            {status === "codeError" && (
              <Text
                className="text-sm text-danger"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Esse código não funcionou. Confere os números, ou peça um código
                novo: ele vale por um tempo curto e só uma vez.
              </Text>
            )}

            <PrimaryAction
              label={status === "verifying" ? "Entrando…" : "Entrar"}
              onPress={handleVerify}
              disabled={!canVerify}
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
                Sem senha: mandamos um código pro seu email, e você entra com
                ele.
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
                Não consegui enviar o email agora. Confere o endereço e tenta de
                novo em alguns minutos.
              </Text>
            )}

            <PrimaryAction
              label={status === "sending" ? "Enviando…" : "Enviar código"}
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
