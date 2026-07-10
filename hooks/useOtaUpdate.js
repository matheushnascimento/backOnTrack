// Checagem de update OTA (EAS Update, Ciclo 4, #76).
//
// No mount e sempre que o app volta ao primeiro plano, verifica se há um update
// publicado no canal (eas update --branch preview). Se houver, baixa e pergunta
// se o usuário quer aplicar agora (reload). Falhas (ex: offline) são silenciosas
// — nunca quebram a tela.
//
// Só roda em build nativo com updates habilitado: na web e em dev (__DEV__) o
// Updates fica desligado, então as guardas evitam qualquer chamada.

/* global __DEV__ */
import { useEffect } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

async function checkAndPrompt() {
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return;
    await Updates.fetchUpdateAsync();
    Alert.alert("Atualização disponível", "Aplicar agora?", [
      { text: "Depois", style: "cancel" },
      { text: "Atualizar", onPress: () => Updates.reloadAsync() },
    ]);
  } catch {
    // Sem rede / update indisponível: ignora e tenta de novo no próximo foco.
  }
}

export function useOtaUpdate() {
  useEffect(() => {
    if (Platform.OS === "web" || __DEV__ || !Updates.isEnabled) return;

    checkAndPrompt();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAndPrompt();
    });
    return () => sub.remove();
  }, []);
}
