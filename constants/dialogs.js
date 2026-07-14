// Diálogos cross-platform.
//
// O `Alert` do React Native NÃO é implementado no react-native-web: no
// navegador o diálogo nunca aparece e, pior, a ação de confirmação nunca roda
// (o botão parece morto). Aqui o web cai no confirm/alert nativo do browser e o
// native segue usando o Alert de sempre.

import { Alert, Platform } from "react-native";

/**
 * Confirmação de ação (tipicamente destrutiva). Só chama `onConfirm` se o
 * usuário confirmar.
 * @param {{
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   destructive?: boolean,
 *   onConfirm: () => void,
 * }} options
 * @returns {void}
 */
export function confirmAction({
  title,
  message,
  confirmLabel = "Confirmar",
  destructive = true,
  onConfirm,
}) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

/**
 * Aviso informativo, sem escolha.
 * @param {string} title
 * @param {string} [message]
 * @returns {void}
 */
export function notify(title, message) {
  if (Platform.OS === "web") {
    globalThis.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
