// @ts-nocheck -- helper puro; tipos vêm quando toda a infra/ for tipada (ADR-002)

/**
 * Decisões de conexão que dependem do estado da sessão (#275).
 *
 * Isolado num arquivo próprio pelo mesmo motivo do `sync-url.js` e do
 * `sync-retry.js`: é lógica pura, testável sem puxar `infra/sync.js` (que
 * importa Supabase/AsyncStorage e não roda no jest).
 *
 * As duas funções aqui existem porque o sync errava ao tratar "ainda não sei"
 * como se fosse uma resposta:
 *
 * - `resolveRoomId` — sessão carregando não é "deslogado".
 * - `isTokenExpired` — token vencido na mão não é motivo pra tentar conectar.
 */

/**
 * Sala onde conectar, ou `null` enquanto a resposta não é confiável.
 *
 * `getSession()` do Supabase é assíncrono: no 1º render do app o `session` é
 * `null` mesmo pra quem está logado. Ler `user?.id ?? anonRoomId` nesse
 * instante devolve a sala **anônima** — e o `startSync()` que vem logo atrás
 * empurra a store inteira pra lá antes da sessão resolver.
 *
 * Com `AUTH_MODE=optional` isso vira uma cópia completa dos dados
 * autenticados numa sala que conecta sem token. Depois do flip pra `required`
 * viraria falha garantida em toda abertura.
 *
 * Por isso o gate em `ready`: sem sessão resolvida, não há sala — o caller
 * trata `null` como "espera", não como "desligado".
 *
 * @param {boolean} ready Sessão já resolvida (`SessionProvider.ready`).
 * @param {{ id?: string } | null | undefined} user Usuário logado, se houver.
 * @param {string | null | undefined} anonRoomId UUID por-install, do disco.
 * @returns {string | null} Sala, ou `null` se ainda não dá pra decidir.
 */
export function resolveRoomId(ready, user, anonRoomId) {
  if (!ready) return null;
  return user?.id ?? anonRoomId ?? null;
}

/**
 * O access_token já venceu?
 *
 * Voltar do background reconecta na hora (`AppState` → `active`), mas o token
 * que está no state do React pode ter vencido enquanto o app dormia. Tentar
 * com ele produz `rejecting: invalid token: expired` no server e uma
 * piscada de "offline" — foram 8 dessas no log entre 06/08 e 12/08.
 *
 * Quando isto devolve `true`, o caller **não** reconecta: o
 * `startAutoRefresh` (ligado no `SessionProvider`) renova, o
 * `onAuthStateChange` publica a sessão nova, a URL muda e o synchronizer é
 * recriado sozinho com o token fresco.
 *
 * `expires_at` do Supabase vem em **segundos** epoch, não milissegundos.
 *
 * Sessão anônima (sem token) nunca está vencida — não há o que renovar.
 *
 * @param {{ expires_at?: number, access_token?: string } | null | undefined} session
 * @param {number} [now] Epoch em ms; injetável pra teste.
 * @param {number} [skewMs] Margem pra contar como vencido um token prestes a
 *   vencer — o round-trip até o server leva algum tempo. Default 5s.
 * @returns {boolean}
 */
export function isTokenExpired(session, now = Date.now(), skewMs = 5_000) {
  if (!session?.access_token) return false;
  const exp = Number(session.expires_at);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  return exp * 1000 - skewMs <= now;
}
