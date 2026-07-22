// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import MyButton from "@/components/MyButton";
import MyInput from "@/components/MyInput";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";

import { FEEDBACK_ENDPOINT, FEEDBACK_KEY } from "@/constants/feedback";
import { getEnvironmentInfo } from "@/constants/environment";
//#endregion

const INPUT = "w-full";

const CATEGORIES = ["Bug", "Sugestão", "Outro"];

// Contexto que ajuda a triar a issue depois, coletado sem o tester digitar.
const ENV = getEnvironmentInfo();

export default function Feedback() {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [result, setResult] = useState(null); // { number, url }
  const [errorMsg, setErrorMsg] = useState("");

  const canSend =
    status !== "sending" && (title.trim() !== "" || description.trim() !== "");

  async function handleSend() {
    if (!canSend) return;
    setStatus("sending");
    setErrorMsg("");
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
      setErrorMsg(String(e?.message ?? e));
      setStatus("error");
    }
  }

  function resetForm() {
    setCategory("");
    setTitle("");
    setDescription("");
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  }

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <MyHeader />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {status === "ok" ? (
          <Card className="gap-3">
            <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
              Recebido! 🙌
            </Text>
            <Text className="text-base text-light-text opacity-70 dark:text-dark-text">
              Abrimos o chamado #{result?.number}. Obrigado por reportar — dá
              pra acompanhar quando quiser.
            </Text>
            {result?.url && (
              <MyButton
                title="Ver o chamado"
                onPress={() => Linking.openURL(result.url)}
              />
            )}
            <MyButton title="Enviar outro" onPress={resetForm} />
            <MyButton
              title="Voltar ao início"
              onPress={() => router.navigate("/")}
            />
          </Card>
        ) : (
          <>
            <Card className="gap-1">
              <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
                Enviar feedback
              </Text>
              <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
                Achou um problema ou tem uma sugestão? Conta aqui — abrimos o
                chamado pra você automaticamente.
              </Text>
            </Card>

            <Card className="gap-4">
              {/* Categoria (opcional) */}
              <MyView safe={false} className="gap-2">
                <SectionLabel>CATEGORIA (OPCIONAL)</SectionLabel>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <MyButton
                      key={c}
                      title={c}
                      isSelected={category === c}
                      onPress={() => setCategory(category === c ? "" : c)}
                    />
                  ))}
                </View>
              </MyView>

              <MyInput
                label="Título"
                placeholder="Resumo em uma linha"
                value={title}
                onChangeText={setTitle}
                containerClassName="w-full"
                className={INPUT}
                maxLength={140}
              />

              <MyInput
                label="Descrição"
                placeholder="O que aconteceu? Se for um bug, como reproduzir?"
                value={description}
                onChangeText={setDescription}
                containerClassName="w-full"
                className={INPUT}
                multiline
                numberOfLines={6}
                style={{ minHeight: 120, textAlignVertical: "top" }}
              />

              {status === "error" && (
                <Text className="text-sm text-danger">
                  Não consegui enviar ({errorMsg}). Tenta de novo em instantes.
                </Text>
              )}

              <MyButton
                title={status === "sending" ? "Enviando…" : "Enviar"}
                onPress={handleSend}
                disabled={!canSend}
                className={canSend ? "" : "opacity-50"}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </MyView>
  );
}
