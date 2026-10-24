/* global process */
// Configuração da tela de feedback (Track B do M3-5, #101).
//
// FEEDBACK_ENDPOINT: função serverless na Vercel, mesma origem do web export
// (ver package.json "homepage"). É ela que guarda o PAT e abre a issue.
// FEEDBACK_KEY: segredo compartilhado semi-público (EXPO_PUBLIC_*, embutido no
// bundle) só pra deter abuso casual. O token real fica só na Vercel. Se vazio,
// o endpoint aceita sem header (liga-se o segredo depois definindo a env dos
// dois lados).

export const FEEDBACK_ENDPOINT = "https://backontrack.mhdn.com.br/api/feedback";

export const FEEDBACK_KEY = process.env.EXPO_PUBLIC_FEEDBACK_KEY ?? "";

/**
 * De quem foi a falha no envio: da conexão de quem envia, ou do servidor.
 *
 * As duas mostravam "Não consegui enviar agora", e quando o token do GitHub
 * venceu (out/2026) uma tester tentou várias vezes achando que era a internet
 * dela. Dizer que o problema é do nosso lado poupa as tentativas e avisa que
 * vale mandar por outro caminho.
 *
 * O `fetch` só rejeita quando não chega resposta nenhuma (sem rede, DNS, CORS).
 * Qualquer resposta HTTP, mesmo de erro, prova que a conexão funcionou.
 *
 * @param {{status?: number}|null|undefined} resposta a do `fetch`, se houve
 * @returns {"conexao"|"servidor"}
 */
export function falhaDoEnvio(resposta) {
  return resposta && Number.isFinite(resposta.status) ? "servidor" : "conexao";
}
