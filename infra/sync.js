// @ts-nocheck -- useSession retorna contexto tipado como never no tsc (ADR-002)
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { useCreateSynchronizer, useValue } from "tinybase/ui-react";
import { SYNC_URL } from "@/constants/sync";
import { store } from "./database";
import { useSession } from "./session";
import { buildSyncUrl } from "./sync-url";
import { retryDelay } from "./sync-retry";

// Re-exporta pra manter API estável (callers antigos podem importar de sync.js).
// A implementação vive em infra/sync-url.js pra ficar testável isolado
// (evita puxar Supabase/AsyncStorage no jest).
export { buildSyncUrl };

/** Estados possíveis de `useRegistrosSync`. */
export const SYNC_OFF = "off";
export const SYNC_CONNECTING = "connecting";
export const SYNC_ONLINE = "online";
export const SYNC_OFFLINE = "offline";

/**
 * Conecta o MergeableStore ao server WS de sync, com reconexão automática.
 *
 * - **Deslogado** (session null): usa `syncRoomId` (UUID por-install) como
 *   pathId, sem `?token=`. É o comportamento pré-auth (M6 fatia 3, #202).
 * - **Logado** (session presente): usa `user.id` como pathId + JWT do Supabase
 *   em `?token=`. Server valida a assinatura e enforça `sub === pathId`.
 *
 * ## Por que a reconexão precisa observar o socket na mão
 *
 * `createWsSynchronizer` **resolve mesmo quando a conexão falha** — ele
 * escuta `open` E `error` e resolve nos dois casos (ver
 * `synchronizers/synchronizer-ws-client`). Então um 401 do server produz um
 * synchronizer "válido" envolvendo um socket morto, e nenhum `catch` dispara.
 * Foi assim que a quebra do ES256 passou semanas invisível: sem exceção, sem
 * log, sem sintoma além de "os dados não aparecem no outro aparelho".
 *
 * Por isso escutamos `close`/`error` do WebSocket direto, em vez de confiar
 * na promise.
 *
 * ## Como a reconexão funciona
 *
 * Ao cair, agenda nova tentativa com backoff exponencial + jitter
 * (`sync-retry.js`). Cada tentativa recria o synchronizer inteiro — bumpar
 * `generation` muda as deps do `useCreateSynchronizer`, que derruba o antigo
 * e monta um novo. Voltar pro foreground (`AppState` → `active`) reconecta
 * na hora, sem esperar o backoff: o SO costuma matar o socket em background
 * e o usuário que reabre o app quer sync imediato.
 *
 * Depende do `useRegistrosPersistencia` já ter rodado — é ele quem carrega o
 * `syncRoomId` do disco (ou gera no 1º launch).
 *
 * @returns {"off"|"connecting"|"online"|"offline"} Estado atual, pra UI.
 */
export function useRegistrosSync() {
  const { user, session } = useSession();
  const anonRoomId = useValue("syncRoomId", store);

  // roomId: user.id se logado; senão o UUID anônimo.
  // token: JWT se logado; senão null (server em optional-mode aceita anônimo).
  const roomId = user?.id ?? anonRoomId;
  const token = session?.access_token ?? null;
  const url = buildSyncUrl(SYNC_URL, roomId, token);

  const [status, setStatus] = useState(url ? SYNC_CONNECTING : SYNC_OFF);
  // Só cresce; entra nas deps pra forçar recriação do synchronizer.
  const [generation, setGeneration] = useState(0);

  // Expoente do backoff. Ref (não state) de propósito: zerar no sucesso não
  // pode mudar deps, senão derrubaria a conexão que acabou de subir.
  const retryExpRef = useRef(0);
  const retryTimerRef = useRef(null);
  // Socket da tentativa corrente. Usado pra ignorar `close` de conexões
  // obsoletas — na troca de deps o create do novo roda ANTES do destroy do
  // antigo, então o close do antigo chegaria depois e agendaria retry à toa.
  const currentWsRef = useRef(null);
  const mountedRef = useRef(true);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const reconnectNow = useCallback(() => {
    clearRetry();
    retryExpRef.current = 0;
    setGeneration((g) => g + 1);
  }, [clearRetry]);

  // URL nova (login, logout, refresh de token) = contexto novo: zera backoff.
  useEffect(() => {
    retryExpRef.current = 0;
    clearRetry();
  }, [url, clearRetry]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRetry();
    };
  }, [clearRetry]);

  // Voltar pro foreground reconecta na hora se estiver caído — não espera o
  // backoff, que pode estar no teto de 30s.
  useEffect(() => {
    // No web o AppState devolve `undefined` quando não há `document`
    // (prerender do `expo export`) — sem a guarda, o cleanup quebraria o
    // build. Native sempre devolve subscription.
    const sub = AppState.addEventListener?.("change", (next) => {
      if (next !== "active") return;
      const ws = currentWsRef.current;
      // readyState 1 = OPEN. Qualquer outra coisa = reconectar.
      if (!ws || ws.readyState !== 1) reconnectNow();
    });
    return () => sub?.remove?.();
  }, [reconnectNow]);

  useCreateSynchronizer(
    store,
    async (s) => {
      if (!url) {
        setStatus(SYNC_OFF);
        return undefined;
      }
      setStatus(SYNC_CONNECTING);

      const ws = new WebSocket(url);
      currentWsRef.current = ws;

      const onDown = () => {
        // Conexão obsoleta (já trocamos de socket) ou hook desmontado:
        // não mexer em estado nem agendar nada.
        if (currentWsRef.current !== ws || !mountedRef.current) return;
        if (retryTimerRef.current) return; // retry já agendado
        setStatus(SYNC_OFFLINE);
        const delay = retryDelay(retryExpRef.current);
        retryExpRef.current += 1;
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (mountedRef.current) setGeneration((g) => g + 1);
        }, delay);
      };

      ws.addEventListener("close", onDown);
      ws.addEventListener("error", onDown);

      try {
        const sync = await createWsSynchronizer(s, ws);
        await sync.startSync();
        // Não confiar na promise: ela resolve mesmo em erro. O readyState é
        // que diz se a conexão está de pé.
        if (ws.readyState === 1) {
          if (currentWsRef.current === ws && mountedRef.current) {
            retryExpRef.current = 0;
            setStatus(SYNC_ONLINE);
          }
        } else {
          onDown();
        }
        return sync;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[sync] falhou ao conectar:", msg);
        onDown();
        return undefined;
      }
    },
    // Reconecta em troca de URL (login/logout/token refresh) e a cada
    // tentativa agendada pelo backoff.
    [url, generation],
  );

  return status;
}
