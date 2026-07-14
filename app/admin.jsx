// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Tela de administração de testers (Track A do M3-5, #109). Acesso só por deep
// link `backontrack://admin` — de propósito NÃO fica linkada nos Utilitários.
// A lista vive em TinyBase local (por-device), então numa instalação de tester
// esta tela aparece vazia; só o aparelho do admin popula.
//#region imports
import { useCallback, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import MyButton from "@/components/MyButton";
import MyInput from "@/components/MyInput";

import { shadow } from "@/constants/Colors";
import { confirmAction, notify } from "@/constants/dialogs";
import { getTesters, addTester, removeTester } from "@/infra/database";
//#endregion

const CARD =
  "w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard";
const LABEL =
  "font-bold text-xs text-light-text opacity-60 dark:text-dark-text";

export default function Admin() {
  const [testers, setTesters] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const reload = useCallback(() => setTesters(getTesters()), []);
  useFocusEffect(reload);

  const canAdd = name.trim() !== "" && phone.trim() !== "";

  function handleAdd() {
    if (!canAdd) return;
    addTester({ name, phone });
    setName("");
    setPhone("");
    reload();
  }

  function handleRemove(tester) {
    confirmAction({
      title: "Remover tester",
      message: `Remover ${tester.name} da lista?`,
      confirmLabel: "Remover",
      onConfirm: () => {
        removeTester(tester.id);
        reload();
      },
    });
  }

  async function handleExport() {
    if (testers.length === 0) {
      notify("Lista vazia", "Adicione ao menos um tester antes de exportar.");
      return;
    }
    // Formato consumido pelo sender (scripts/testers.json): array de {name, phone}.
    const json = JSON.stringify(
      testers.map(({ name, phone }) => ({ name, phone })),
      null,
      2,
    );
    try {
      await Share.share({ message: json });
    } catch (e) {
      notify("Não deu pra compartilhar", String(e?.message ?? e));
    }
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
        {/* Adicionar tester */}
        <MyView safe={false} className={`${CARD} gap-4`} style={shadow}>
          <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
            Testers
          </Text>
          <MyInput
            label="Nome"
            placeholder="Nome do tester"
            value={name}
            onChangeText={setName}
            containerClassName="w-full"
            className="w-full"
            autoCapitalize="words"
          />
          <MyInput
            label="Número (com DDI)"
            placeholder="+55 11 99999-9999"
            value={phone}
            onChangeText={setPhone}
            containerClassName="w-full"
            className="w-full"
            keyboardType="phone-pad"
          />
          <MyButton
            title="Adicionar"
            onPress={handleAdd}
            disabled={!canAdd}
            className={canAdd ? "" : "opacity-50"}
          />
        </MyView>

        {/* Lista */}
        <MyView safe={false} className={`${CARD} gap-3`} style={shadow}>
          <Text className={LABEL}>NA LISTA ({testers.length})</Text>
          {testers.length === 0 ? (
            <Text className="text-base text-light-text opacity-60 dark:text-dark-text">
              Nenhum tester ainda.
            </Text>
          ) : (
            <MyView safe={false} className="gap-2">
              {testers.map((t) => (
                <View key={t.id} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <Text className="text-base text-light-text dark:text-dark-text">
                      {t.name}
                    </Text>
                    <Text className="text-sm text-light-text opacity-60 dark:text-dark-text">
                      {t.phone}
                    </Text>
                  </View>
                  <MyButton
                    title="Remover"
                    onPress={() => handleRemove(t)}
                    className="bg-secondary px-3 py-1"
                  />
                </View>
              ))}
            </MyView>
          )}
        </MyView>

        {/* Exportar */}
        <MyView safe={false} className={`${CARD} gap-2`} style={shadow}>
          <Text className={LABEL}>SENDER</Text>
          <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
            Exporta a lista em JSON pra colar em `scripts/testers.json`.
          </Text>
          <MyButton title="Exportar lista" onPress={handleExport} />
        </MyView>
      </ScrollView>
    </MyView>
  );
}
