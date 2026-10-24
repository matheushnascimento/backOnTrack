// Identificação do assistente nas mensagens enviadas (#385).
//
// O assistente manda mensagem aos testers pelo número dedicado. Sem esta
// linha, o texto soava como se fosse o Matheus escrevendo, e foi assim com as
// duas primeiras mensagens individuais, em 22/10.
//
// Em CommonJS e fora do `notify-testers.mjs` pelo mesmo motivo do
// `tester-filter.js`: o jest importa direto, e o script de envio tem `await` no
// topo.

const IDENTIFICACAO = "🤖 _Aqui é o assistente do Back on Track._";

/**
 * Põe a identificação no topo, se o texto ainda não se identifica.
 *
 * Só pro modo de ENVIO. No modo de impressão o Matheus manda do próprio
 * WhatsApp, e ali a linha estaria errada.
 *
 * @param {string} texto
 * @returns {string}
 */
function identificar(texto) {
  const corpo = String(texto ?? "").trim();
  if (/assistente do back on track/i.test(corpo)) return corpo;
  return `${IDENTIFICACAO}\n\n${corpo}`;
}

module.exports = { IDENTIFICACAO, identificar };
