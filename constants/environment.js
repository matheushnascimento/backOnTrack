// Contexto de execução que acompanha o feedback, pra triagem (#116).
//
// Antes daqui o único campo era `Platform.OS + Platform.Version`, que produzia
// "android 36" ou "web 0.0.0". A informação existia, mas exigia saber que
// `web` = navegador e `android` = app nativo — quem tria a issue não sabe. E no
// navegador o "web 0.0.0" não dizia NADA: nem qual browser, nem qual OS, justo
// no caso mais difícil de reproduzir.
//
// O `appVersion` também engana sozinho: as entregas chegam por OTA sem mudar o
// "1.0.0", então dois testers em bundles JS diferentes reportavam a mesma
// versão. Daí o campo `bundle`.

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

/** @returns {string} ex: "App nativo (Android 36)" | "Navegador" */
function describeEnvironment() {
  if (Platform.OS === "web") return "Navegador";
  const os = Platform.OS === "ios" ? "iOS" : "Android";
  return `App nativo (${os} ${Platform.Version ?? "?"})`;
}

/**
 * Identifica o bundle JS em execução. Sem isso, "1.0.0" é ambíguo entre todas
 * as entregas OTA feitas sobre a mesma versão nativa.
 * @returns {string}
 */
function describeBundle() {
  try {
    // Em dev/web esses campos vêm nulos — degrada sem quebrar.
    const { updateId, channel, isEmbeddedLaunch } = Updates;
    if (!updateId) return isEmbeddedLaunch ? "embutido no app" : "";
    const curto = String(updateId).slice(0, 8);
    return channel ? `OTA ${curto} (canal: ${channel})` : `OTA ${curto}`;
  } catch {
    return "";
  }
}

/**
 * Tudo que o app sabe sobre o próprio ambiente, sem o tester digitar nada.
 * @returns {{ environment: string, userAgent: string, appVersion: string, bundle: string }}
 */
export function getEnvironmentInfo() {
  return {
    environment: describeEnvironment(),
    // Só faz sentido no web; no native não existe navegador.
    userAgent:
      Platform.OS === "web" ? (globalThis.navigator?.userAgent ?? "") : "",
    appVersion: Constants.expoConfig?.version ?? "?",
    bundle: describeBundle(),
  };
}
