// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Tela de administração de testers (Track A do M3-5, #109). Acesso só por deep
// link `backontrack://admin` — de propósito NÃO fica linkada nos Utilitários.
// A lista vive em TinyBase local (por-device), então numa instalação de tester
// esta tela aparece vazia; só o aparelho do admin popula.
//#region imports
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTable } from "tinybase/ui-react";

import MyView from "@/components/MyView";

import { confirmAction, notify } from "@/constants/dialogs";
import { getTesters, addTester, removeTester, store } from "@/infra/database";
import { useThemeTokens } from "@/constants/themeTokens";
//#endregion

export default function Admin() {
  const t = useThemeTokens();
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
      // No web o destino é a máquina de dev (colar no scripts/testers.json), e
      // a Web Share API nem existe em boa parte do desktop — clipboard é o
      // certo. No native, o share sheet é o caminho natural pra tirar o JSON
      // do device.
      if (Platform.OS === "web") {
        await globalThis.navigator.clipboard.writeText(json);
        notify("Lista copiada", "Cole em scripts/testers.json.");
        return;
      }
      await Share.share({ message: json });
    } catch (e) {
      // Erro de share/clipboard não vaza pro usuário — só console.
      console.error("[admin] export falhou:", e);
      notify("Não deu pra exportar", "Tenta de novo em instantes.");
    }
  }

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
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

        {/* Header */}
        <View className="gap-1 px-1">
          <Text
            className="text-xs tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            ADMIN
          </Text>
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Testers
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            Lista local do aparelho, consumida pelo sender WhatsApp.
          </Text>
        </View>

        {/* Adicionar tester */}
        <View className="gap-4">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Adicionar
          </Text>
          <V2Field
            label="Nome"
            placeholder="Nome do tester"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            tokens={t}
          />
          <V2Field
            label="Número (com DDI)"
            placeholder="+55 11 99999-9999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            tokens={t}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar tester"
            accessibilityState={{ disabled: !canAdd }}
            disabled={!canAdd}
            onPress={handleAdd}
            className={`items-center rounded-2xl py-4 ${
              canAdd
                ? "bg-primary dark:bg-primary-dark active:opacity-70"
                : "bg-border-strong dark:bg-border-strong-dark"
            }`}
          >
            <Text
              className="text-base text-white dark:text-on-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Adicionar
            </Text>
          </Pressable>
        </View>

        {/* Lista */}
        <View className="gap-2.5">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Na lista · {testers.length}
          </Text>
          {testers.length === 0 ? (
            <View className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-6">
              <Text
                className="text-center text-sm text-body-secondary dark:text-body-secondary-dark"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Nenhum tester ainda.
              </Text>
            </View>
          ) : (
            testers.map((tester) => (
              <View
                key={tester.id}
                className="flex-row items-center gap-3 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-4"
              >
                <View className="flex-1 gap-0.5">
                  <Text
                    className="text-base text-ink dark:text-ink-dark"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {tester.name}
                  </Text>
                  <Text
                    className="text-xs text-body-secondary dark:text-body-secondary-dark"
                    style={{ fontFamily: "JetBrainsMono_400Regular" }}
                  >
                    {tester.phone}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${tester.name}`}
                  onPress={() => handleRemove(tester)}
                  className="rounded-xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark px-3 py-2 active:opacity-70"
                >
                  <Text
                    className="text-sm text-danger"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Remover
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Exportar */}
        <View className="gap-2">
          <Text
            className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            Sender
          </Text>
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Exporta a lista em JSON pra colar em{" "}
            <Text style={{ fontFamily: "JetBrainsMono_400Regular" }}>
              scripts/testers.json
            </Text>
            .
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Exportar lista"
            onPress={handleExport}
            className="items-center rounded-2xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark py-4 active:opacity-70"
          >
            <Text
              className="text-base text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Exportar lista
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </MyView>
  );
}

/**
 * @param {{ label: string, placeholder: string, value: string,
 *   onChangeText: (v: string) => void, autoCapitalize?: string,
 *   keyboardType?: string, tokens: any }} props
 */
function V2Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize,
  keyboardType,
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
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4"
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          color: tokens.ink,
          paddingVertical: 14,
        }}
      />
    </View>
  );
}
