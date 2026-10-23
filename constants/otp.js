// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Código de login do e-mail (#376).
 *
 * Existe porque o link sozinho falha quando abre num navegador diferente do
 * que pediu o e-mail: o fluxo PKCE guarda uma chave no navegador que pediu, e
 * só ele consegue trocar o link pela sessão. No iPhone isso é comum, porque o
 * link do Gmail abre no Safari, e o pedido pode ter saído do app na tela
 * inicial, que tem armazenamento próprio. O código é digitado no mesmo lugar
 * que pediu, então não depende de onde o link abre.
 */

/**
 * Faixa de tamanho que o Supabase aceita pro código de e-mail. O padrão é 6,
 * e o painel deixa subir até 10. Fixar 6 aqui quebraria em silêncio no dia em
 * que alguém mudasse a configuração.
 */
export const OTP_MIN = 6;
export const OTP_MAX = 10;

/**
 * Só os dígitos, até o máximo.
 *
 * Quem cola do e-mail traz espaço, quebra de linha, às vezes o código
 * formatado como "123 456". Recusar isso obrigaria a pessoa a limpar na mão.
 *
 * @param {string} texto
 * @returns {string}
 */
export function limparCodigo(texto) {
  return String(texto ?? "")
    .replace(/\D/g, "")
    .slice(0, OTP_MAX);
}

/** O código tem o tamanho de um código de verdade? */
export function codigoCompleto(codigo) {
  return /^\d+$/.test(String(codigo ?? "")) && codigo.length >= OTP_MIN;
}
