// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { goBack } from "@/constants/navigation";
import MyView from "@/components/MyView";

import { FEEDBACK_ENDPOINT, FEEDBACK_KEY } from "@/constants/feedback";
import { getEnvironmentInfo } from "@/constants/environment";
import { useThemeTokens } from "@/constants/themeTokens";
//#endregion

const CATEGORIES = ["Bug", "Sugestão", "Outro"];

// Contexto que ajuda a triar a issue depois, coletado sem o tester digitar.
const ENV = getEnvironmentInfo();

export default function Feedback() {
  const t = useThemeTokens();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [result, setResult] = useState(null); // { number, url }

  const canSend =
    status !== "sending" && (title.trim() !== "" || description.trim() !== "");

  async function handleSend() {
    if (!canSend) return;
    setStatus("sending");
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(FEEDBACK_KEY ? { "x-feedback-key": FEEDBACK_KEY } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          body: description.trim(),
          category,
          ...ENV,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setStatus("ok");
    } catch (e) {
      // Detalhe técnico só no console (mesma regra do login #216), o que evita
      // vazar shape do backend pro usuário e não ajuda quem tá vendo.
      console.error("feedback send failed:", e);
      setStatus("error");
    }
  }

  function resetForm() {
    setCategory("");
    setTitle("");
    setDescription("");
    setResult(null);
    setStatus("idle");
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

        {status === "ok" ? (
          <SuccessState
            result={result}
            onSendAnother={resetForm}
            onHome={() => router.navigate("/")}
          />
        ) : (
          <>
            {/* Header */}
            <View className="gap-1 px-1">
              <Text
                className="text-2xl text-ink dark:text-ink-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Enviar feedback
              </Text>
              <Text
                className="text-sm text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
              >
                Achou um problema ou tem uma sugestão? Conta aqui, e abrimos o
                chamado pra você automaticamente.
              </Text>
            </View>

            {/* Categoria (opcional) */}
            <View>
              <Text
                className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                Categoria (opcional)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const selected = category === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`Categoria: ${c}`}
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(selected ? "" : c)}
                      className={`rounded-full px-4 py-2 ${
                        selected
                          ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
                          : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selected
                            ? "text-primary dark:text-primary-dark"
                            : "text-body-secondary dark:text-body-secondary-dark"
                        }`}
                        style={{
                          fontFamily: selected
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                        }}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Título */}
            <V2Field
              label="Título"
              placeholder="Resumo em uma linha"
              value={title}
              onChangeText={setTitle}
              maxLength={140}
              tokens={t}
            />

            {/* Descrição */}
            <V2Field
              label="Descrição"
              placeholder="O que aconteceu? Se for um bug, como reproduzir?"
              value={description}
              onChangeText={setDescription}
              multiline
              tokens={t}
            />

            {status === "error" && (
              <Text
                className="text-sm text-danger"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Não consegui enviar agora. Tenta de novo em instantes.
              </Text>
            )}

            {/* Enviar */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar feedback"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={handleSend}
              className={`mt-2 items-center rounded-2xl py-4 ${
                canSend
                  ? "bg-primary dark:bg-primary-dark active:opacity-70"
                  : "bg-border-strong dark:bg-border-strong-dark"
              }`}
            >
              <Text
                className="text-base text-white dark:text-on-primary-dark"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {status === "sending" ? "Enviando…" : "Enviar"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </MyView>
  );
}

/**
 * @param {{ label: string, placeholder: string, value: string,
 *   onChangeText: (v: string) => void, maxLength?: number,
 *   multiline?: boolean, tokens: any }} props
 */
function V2Field({
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  multiline,
  tokens,
}) {
  return (
    <View>
      <Text
        className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.iconDim}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 6 : 1}
        accessibilityLabel={label}
        className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4"
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          color: tokens.ink,
          paddingVertical: multiline ? 12 : 14,
          minHeight: multiline ? 120 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

/** @param {{ result: {number?: number, url?: string} | null, onSendAnother: () => void, onHome: () => void }} props */
function SuccessState({ result, onSendAnother, onHome }) {
  return (
    <View className="mt-4 gap-4">
      <View className="gap-1 px-1">
        <Text
          className="text-2xl text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Recebido 🙌
        </Text>
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
        >
          {result?.number
            ? `Abrimos o chamado #${result.number}. Obrigado por reportar. Dá pra acompanhar quando quiser.`
            : "Obrigado por reportar."}
        </Text>
      </View>

      {result?.url && (
        <SecondaryAction
          label="Ver o chamado"
          onPress={() => Linking.openURL(result.url)}
        />
      )}

      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar outro feedback"
          onPress={onSendAnother}
          className="items-center rounded-2xl bg-primary dark:bg-primary-dark py-4 active:opacity-70"
        >
          <Text
            className="text-base text-white dark:text-on-primary-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Enviar outro
          </Text>
        </Pressable>
        <SecondaryAction label="Voltar ao início" onPress={onHome} />
      </View>
    </View>
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
