/* global process */
// Configuração da tela de feedback (Track B do M3-5, #101).
//
// FEEDBACK_ENDPOINT: função serverless na Vercel, mesma origem do web export
// (ver package.json "homepage"). É ela que guarda o PAT e abre a issue.
// FEEDBACK_KEY: segredo compartilhado semi-público (EXPO_PUBLIC_*, embutido no
// bundle) só pra deter abuso casual — o token real fica só na Vercel. Se vazio,
// o endpoint aceita sem header (liga-se o segredo depois definindo a env dos
// dois lados).

export const FEEDBACK_ENDPOINT = "https://backontrack.mhdn.com.br/api/feedback";

export const FEEDBACK_KEY = process.env.EXPO_PUBLIC_FEEDBACK_KEY ?? "";
