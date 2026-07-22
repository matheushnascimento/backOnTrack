// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Tela de administração de testers (Track A do M3-5, #109). Acesso só por deep
// link `backontrack://admin` — de propósito NÃO fica linkada nos Utilitários.
// A lista vive em TinyBase local (por-device), então numa instalação de tester
// esta tela aparece vazia; só o aparelho do admin popula.
//#region imports
import { useMemo, useState } from "react";
import { Platform, ScrollView, Share, Text, View } from "react-native";
import { useTable } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import MyButton from "@/components/MyButton";
import MyInput from "@/components/MyInput";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";

import { confirmAction, notify } from "@/constants/dialogs";
import { getTesters, addTester, removeTester, store } from "@/infra/database";
//#endregion

export default function Admin() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Assina a tabela: re-renderiza a cada mudança — inclusive quando o
  // `startAutoLoad()` da persistência termina. Ler só no foco fazia a lista
  // nascer vazia no primeiro load (mesma causa do #108).
  const testersTable = useTable("testers", store);
  // `testersTable` é gatilho de propósito (ver #108); remover a dep faria a
  // lista não atualizar ao adicionar/remover tester.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const testers = useMemo(() => getTesters(), [testersTable]);

  const canAdd = name.trim() !== "" && phone.trim() !== "";

  function handleAdd() {
    if (!canAdd) return;
    addTester({ name, phone });
    setName("");
    setPhone("");
  }

  function handleRemove(tester) {
    confirmAction({
      title: "Remover tester",
      message: `Remover ${tester.name} da lista?`,
      confirmLabel: "Remover",
      onConfirm: () => removeTester(tester.id),
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
      // No web o destino é a máquina de dev (colar no scripts/testers.json), e a
      // Web Share API nem existe em boa parte do desktop — clipboard é o certo.
      // No native, o share sheet é o caminho natural pra tirar o JSON do device.
      if (Platform.OS === "web") {
        await globalThis.navigator.clipboard.writeText(json);
        notify("Lista copiada", "Cole em scripts/testers.json.");
        return;
      }
      await Share.share({ message: json });
    } catch (e) {
      notify("Não deu pra exportar", String(e?.message ?? e));
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
        <Card className="gap-4">
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
        </Card>

        {/* Lista */}
        <Card className="gap-3">
          <SectionLabel>NA LISTA ({testers.length})</SectionLabel>
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
                    className="bg-danger px-3 py-1"
                  />
                </View>
              ))}
            </MyView>
          )}
        </Card>

        {/* Exportar */}
        <Card className="gap-2">
          <SectionLabel>SENDER</SectionLabel>
          <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
            Exporta a lista em JSON pra colar em `scripts/testers.json`.
          </Text>
          <MyButton title="Exportar lista" onPress={handleExport} />
        </Card>
      </ScrollView>
    </MyView>
  );
}
