// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

import MyButton from "./MyButton";
import SectionLabel from "./SectionLabel";

import { clearAll } from "@/infra/database";
import { useSession } from "@/infra/session";
import { AUTH_ENABLED } from "@/infra/supabase";
import { confirmAction } from "@/constants/dialogs";
import { getEnvironmentInfo } from "@/constants/environment";

const ENV = getEnvironmentInfo();

// Painel de utilitários lateral (esquerda). Aberto pelo botão hamburger da Home.
// Modal RN nativo (sem dep nova de drawer) — animação fade, painel fixo à esquerda
// com backdrop tap-to-close. Ver decisão em conversation (drawer requeria
// gesture-handler nativo = APK nova).
export default function MenuModal({ visible, onClose }) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { user, signOut } = useSession();
  const isDark = colorScheme === "dark";

  // Fecha antes de navegar/agir — evita ver o modal por cima da tela nova.
  function navigateTo(path) {
    onClose();
    router.navigate(path);
  }

  function handleClear() {
    onClose();
    confirmAction({
      title: "Limpar todos os dados",
      message: "Isso apaga todos os registros. Tem certeza?",
      confirmLabel: "Limpar",
      onConfirm: clearAll,
    });
  }

  function handleSignOut() {
    onClose();
    signOut();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 flex-row">
        {/* Painel */}
        <View className="w-4/5 max-w-sm bg-light-background dark:bg-dark-background">
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel>MENU</SectionLabel>
            <MyButton
              title="Histórico"
              onPress={() => navigateTo("/history")}
            />
            <MyButton
              title="Enviar feedback"
              onPress={() => navigateTo("/feedback")}
            />
            <MyButton
              title="Roadmap do projeto"
              onPress={() => navigateTo("/roadmap")}
            />
            {/* Toggle de tema no padrão mobile — Switch nativo com label
                à esquerda. Reflete o estado atual em vez de só "alternar"
                (usuário sabe se está no dark antes de clicar). */}
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-base text-light-text dark:text-dark-text">
                Tema escuro
              </Text>
              <Switch
                value={isDark}
                onValueChange={() => toggleColorScheme()}
                accessibilityLabel="Alternar tema escuro"
              />
            </View>

            <MyButton title="Limpar todos os dados" onPress={handleClear} />

            {AUTH_ENABLED && user && (
              <>
                <Text className="pt-2 text-center text-xs text-light-text opacity-70 dark:text-dark-text">
                  Logado como {user.email}
                </Text>
                <MyButton title="Sair" onPress={handleSignOut} />
              </>
            )}

            {/* Versão pro tester (info diagnóstico). Fica no rodapé do menu
                em vez de na Home pra não competir com o conteúdo (#131). */}
            <Text className="pt-4 text-center text-xs text-light-text opacity-50 dark:text-dark-text">
              v{ENV.appVersion}
              {ENV.bundle ? ` · ${ENV.bundle}` : ""}
            </Text>
          </ScrollView>
        </View>

        {/* Backdrop tap-to-close */}
        <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      </View>
    </Modal>
  );
}
