/* global process */
// Configuração do sync WebSocket (M6 fatia 3, #202).
//
// SYNC_URL: server TinyBase WS no homeserver (ADR-009). Endpoint por-sala é
// `${SYNC_URL}/${roomId}`: o server cria/reabre o arquivo JSON da sala sob
// demanda. Ver server/README.md pra deploy/rotação de subdomínio.
//
// Definir EXPO_PUBLIC_SYNC_URL="" desliga o sync (persistência local segue
// funcionando). Útil pra dev offline e pra desabilitar em ambientes de teste.

export const SYNC_URL =
  process.env.EXPO_PUBLIC_SYNC_URL ?? "wss://backontrack-sync.mhdn.com.br";
