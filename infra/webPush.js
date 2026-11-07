// Web Push dos lembretes (#417). No app, quem agenda é o `expo-notifications`,
// no próprio aparelho (`infra/reminders.js`), e nada daqui se aplica. A
// implementação do navegador mora no `webPush.web.js`.

/** O navegador recebe push? No app, nunca: lá o aviso é local. */
export function pushSuportado() {
  return false;
}

/** iPhone fora do app instalado, onde o iOS não entrega push. */
export function precisaInstalar() {
  return false;
}

export function permissaoConcedida() {
  return false;
}

export async function pedirPermissao() {
  return false;
}

/** No app, a mudança chega pela volta ao primeiro plano (`AppState`). */
export function observarPermissao() {
  return () => {};
}

/**
 * Mesma assinatura do web: `(tipo, avisos)`. No app não há o que mandar.
 *
 * @returns {Promise<Array<object>>}
 */
export async function enviarAgenda() {
  return [];
}

export async function esquecerAparelho() {}
