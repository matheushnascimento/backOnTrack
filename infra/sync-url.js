// @ts-nocheck -- helper puro; tipos vêm quando toda a infra/ for tipada (ADR-002)

/**
 * Monta a URL WS pro server de sync (M6, fatia C, #211).
 *
 * Isolado num arquivo próprio pra ser testável sem puxar `infra/sync.js`
 * inteiro — que importa Supabase/AsyncStorage e não roda no jest (RN
 * native module).
 *
 * Retorna `null` se algum insumo essencial faltar (baseUrl vazio, roomId
 * ainda não carregado do disco) — o caller trata como "sync desligado" e
 * não tenta abrir WebSocket.
 *
 * `token` é opcional. Quando presente, o server valida HS256 no
 * `verifyClient` do WS (fatia B, #211) e enforça `sub === pathId`.
 */
export function buildSyncUrl(baseUrl, roomId, token) {
  if (!baseUrl || !roomId) return null;
  const base = `${baseUrl}/${encodeURIComponent(String(roomId))}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

/**
 * URL do `/healthz`, derivada da mesma base do sync (#278).
 *
 * O server anuncia ali o `authMode`. O client precisa disso porque o 401 do
 * handshake **não atravessa** o WebSocket: browser e React Native não expõem
 * o status HTTP de um upgrade recusado, então uma rejeição por falta de login
 * é indistinguível de queda de rede.
 *
 * Consultar isto resolve as duas coisas de uma vez: se o `/healthz` responde,
 * a rede está de pé e a recusa foi política; se nem ele responde, é rede
 * mesmo. Não precisa de heurística.
 *
 * `wss://` vira `https://` e `ws://` vira `http://` — mesmo host, mesma porta.
 *
 * @param {string} baseUrl Mesma base do `buildSyncUrl` (ex.: `wss://host`).
 * @returns {string | null} `null` se a base estiver vazia (sync desligado).
 */
export function buildHealthzUrl(baseUrl) {
  if (!baseUrl) return null;
  const semBarra = String(baseUrl).replace(/\/+$/, "");
  const http = semBarra
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");
  return `${http}/healthz`;
}
