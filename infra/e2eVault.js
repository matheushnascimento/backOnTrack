// Cofre do aparelho pras chaves destrancadas (#388).
//
// No app é o cofre do sistema (Keychain no iPhone, Keystore no Android), pelo
// expo-secure-store: a chave sobrevive a fechar o app e não fica legível no
// armazenamento comum. No navegador entra o `e2eVault.web.js`.
//
// Uma entrada por conta: trocar de conta no mesmo aparelho não mistura chaves.
import * as SecureStore from "expo-secure-store";

/** O SecureStore só aceita [A-Za-z0-9._-] no nome. */
/** @param {string} conta */
const nome = (conta) =>
  `bot-e2e.${String(conta).replace(/[^A-Za-z0-9._-]/g, "_")}`;

/** @param {string} conta */
export async function lerCofre(conta) {
  return SecureStore.getItemAsync(nome(conta));
}

/**
 * @param {string} conta
 * @param {string} json
 */
export async function gravarCofre(conta, json) {
  await SecureStore.setItemAsync(nome(conta), json);
}

/** @param {string} conta */
export async function apagarCofre(conta) {
  await SecureStore.deleteItemAsync(nome(conta));
}
