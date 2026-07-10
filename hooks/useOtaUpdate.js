/* global __DEV__ */
// Checagem de update OTA (EAS Update, Ciclo 4, #76).
//
// Duas responsabilidades separadas:
//  1. Baixar updates novos assim que aparecem (no mount e ao voltar ao primeiro
//     plano).
//  2. Enquanto houver um update BAIXADO e ainda não aplicado (`isUpdatePending`),
//     oferecer aplicar — de forma REPETÍVEL: se o usuário adiar, o prompt volta
//     no próximo foco. (Sem isso, o update ficava baixado e o prompt nunca mais
//     reaparecia — "uma chance só".)
//
// Só roda em build nativo com updates habilitado: na web e em dev (__DEV__) o
// Updates fica desligado, então as guardas evitam qualquer chamada.

import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

const disabled = Platform.OS === "web" || __DEV__ || !Updates.isEnabled;

export function useOtaUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const prompting = useRef(false);

  const promptApply = useCallback(() => {
    if (prompting.current) return;
    prompting.current = true;
    Alert.alert("Atualização disponível", "Aplicar agora?", [
      {
        text: "Depois",
        style: "cancel",
        onPress: () => {
          prompting.current = false;
        },
      },
      { text: "Atualizar", onPress: () => Updates.reloadAsync() },
    ]);
  }, []);

  // (1) Baixa updates novos no mount e ao voltar ao primeiro plano.
  useEffect(() => {
    if (disabled) return;
    async function fetchIfAny() {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Sem rede / indisponível: ignora e tenta no próximo foco.
      }
    }
    fetchIfAny();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchIfAny();
    });
    return () => sub.remove();
  }, []);

  // (2) Oferece aplicar enquanto houver update pendente — no mount, quando um
  //     download termina, e a cada volta ao primeiro plano. Repetível.
  useEffect(() => {
    if (disabled || !isUpdatePending) return;
    promptApply();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") promptApply();
    });
    return () => sub.remove();
  }, [isUpdatePending, promptApply]);
}
