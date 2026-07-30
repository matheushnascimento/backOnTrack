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
