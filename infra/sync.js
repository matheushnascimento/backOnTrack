// @ts-nocheck -- useSession retorna contexto tipado como never no tsc (ADR-002)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { useCreateSynchronizer, useValue } from "tinybase/ui-react";
import { SYNC_URL } from "@/constants/sync";
import { store } from "./database";
import { useSession } from "./session";
import { buildHealthzUrl, buildSyncUrl } from "./sync-url";
import { retryDelay } from "./sync-retry";
import { isTokenExpired, needsLogin, resolveRoomId } from "./sync-session";

// Re-exporta pra manter API estável (callers antigos podem importar de sync.js).
// A implementação vive em infra/sync-url.js pra ficar testável isolado
// (evita puxar Supabase/AsyncStorage no jest).
export { buildSyncUrl };

/** Estados possíveis de `useRegistrosSync`. */
export const SYNC_OFF = "off";
export const SYNC_CONNECTING = "connecting";
export const SYNC_ONLINE = "online";
export const SYNC_OFFLINE = "offline";
/** Recusado por falta de login, não por rede (#278). Não adianta retentar. */
export const SYNC_NEEDS_AUTH = "needs-auth";

/**
 * Pergunta ao server em que `AUTH_MODE` ele está.
 *
 * Serve a dois propósitos de uma vez: se responde, a rede está de pé e a
 * recusa do WS foi política; se não responde, é rede mesmo. Por isso o
 * `catch` devolve `null` em vez de propagar, porque "não sei" é uma resposta útil
 * aqui, e o caller trata como offline.
 *
 * @param {string | null} healthzUrl
 * @param {number} [timeoutMs]
 * @returns {Promise<string | null>} `"optional"`, `"required"` ou `null`.
 */
async function fetchAuthMode(healthzUrl, timeoutMs = 4000) {
  if (!healthzUrl) return null;
  // AbortController existe em RN e no web; o timeout evita ficar pendurado
  // num server que aceita a conexão TCP e não responde.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(healthzUrl, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const corpo = await res.json();
    return corpo?.authMode ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Conecta o MergeableStore ao server WS de sync, com reconexão automática.
 *
 * - **Sessão carregando** (`ready` false): não conecta em nada. Ver abaixo.
 * - **Deslogado** (session null): usa `syncRoomId` (UUID por-install) como
 *   pathId, sem `?token=`. É o comportamento pré-auth (M6 fatia 3, #202).
 * - **Logado** (session presente): usa `user.id` como pathId + JWT do Supabase
 *   em `?token=`. Server valida a assinatura e enforça `sub === pathId`.
 *
 * ## Por que esperar o `ready` antes de abrir qualquer conexão
 *
 * `getSession()` é assíncrono: no 1º render, quem está logado ainda aparece
 * como `user: null`. Conectar aí resolvia pra sala **anônima**, e o
 * `startSync()` logo atrás empurrava a store inteira pra lá, com
 * `AUTH_MODE=optional`, uma cópia completa dos dados autenticados numa sala
 * que conecta sem token (#275). Por isso `resolveRoomId` devolve `null`
 * enquanto a sessão não resolveu, e `null` aqui significa "espera", não
 * "desligado".
 *
 * ## Por que a reconexão precisa observar o socket na mão
 *
 * `createWsSynchronizer` **resolve mesmo quando a conexão falha**: ele
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
 * (`sync-retry.js`). Cada tentativa recria o synchronizer inteiro, e bumpar
 * `generation` muda as deps do `useCreateSynchronizer`, que derruba o antigo
 * e monta um novo. Voltar pro foreground (`AppState` → `active`) reconecta
 * na hora, sem esperar o backoff: o SO costuma matar o socket em background
 * e o usuário que reabre o app quer sync imediato.
 *
 * Depende do `useRegistrosPersistencia` já ter rodado, porque é ele quem carrega o
 * `syncRoomId` do disco (ou gera no 1º launch).
 *
 * Chamado uma única vez, pelo `SyncStatusProvider`. Telas leem o resultado
 * via `useSyncStatus()`, porque montar o hook duas vezes abriria dois sockets.
 *
 * @returns {{ status: "off"|"connecting"|"online"|"offline", reconnect: () => void }}
 */
export function useRegistrosSync() {
  const { user, session, ready } = useSession();
  const anonRoomId = useValue("syncRoomId", store);

  // roomId: user.id se logado; senão o UUID anônimo. `null` enquanto a sessão
  // não resolveu. Ver `resolveRoomId`, e o porquê logo abaixo em `waiting`.
  // token: JWT se logado; senão null (server em optional-mode aceita anônimo).
  const roomId = resolveRoomId(ready, user, anonRoomId);
  const token = session?.access_token ?? null;
  const url = buildSyncUrl(SYNC_URL, roomId, token);

  // Sem URL por dois motivos bem diferentes: sync desligado (SYNC_URL vazio)
  // ou sessão ainda resolvendo. Tratar o segundo como `off` faria a Home
  // piscar "sync desligado" em toda abertura pra quem está logado.
  const waiting = !ready;

  const [status, setStatus] = useState(
    url || waiting ? SYNC_CONNECTING : SYNC_OFF,
  );
  // Só cresce; entra nas deps pra forçar recriação do synchronizer.
  const [generation, setGeneration] = useState(0);

  // Expoente do backoff. Ref (não state) de propósito: zerar no sucesso não
  // pode mudar deps, senão derrubaria a conexão que acabou de subir.
  const retryExpRef = useRef(0);
  const retryTimerRef = useRef(null);
  // Socket da tentativa corrente. Usado pra ignorar `close` de conexões
  // obsoletas: na troca de deps o create do novo roda ANTES do destroy do
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

  // Voltar pro foreground reconecta na hora se estiver caído, sem esperar o
  // backoff, que pode estar no teto de 30s.
  useEffect(() => {
    // No web o AppState devolve `undefined` quando não há `document`
    // (prerender do `expo export`): sem a guarda, o cleanup quebraria o
    // build. Native sempre devolve subscription.
    const sub = AppState.addEventListener?.("change", (next) => {
      if (next !== "active") return;
      // Token vencido enquanto o app dormia: reconectar agora seria rejeitado
      // pelo server e só geraria ruído. O `startAutoRefresh` (session.js)
      // renova, o `onAuthStateChange` publica a sessão nova, a `url` muda e o
      // synchronizer é recriado sozinho, com token que presta.
      if (isTokenExpired(session)) return;
      const ws = currentWsRef.current;
      // readyState 1 = OPEN. Qualquer outra coisa = reconectar.
      if (!ws || ws.readyState !== 1) reconnectNow();
    });
    return () => sub?.remove?.();
  }, [reconnectNow, session]);

  useCreateSynchronizer(
    store,
    async (s) => {
      if (!url) {
        setStatus(waiting ? SYNC_CONNECTING : SYNC_OFF);
        return undefined;
      }
      setStatus(SYNC_CONNECTING);

      const ws = new WebSocket(url);
      currentWsRef.current = ws;

      const onDown = async () => {
        // Conexão obsoleta (já trocamos de socket) ou hook desmontado:
        // não mexer em estado nem agendar nada.
        if (currentWsRef.current !== ws || !mountedRef.current) return;
        if (retryTimerRef.current) return; // retry já agendado

        // Caiu sem token: pode não ser rede. Sob `AUTH_MODE=required` o
        // server recusa anônimo por política, e o 401 do handshake não chega
        // até aqui, porque a API WebSocket não expõe status de upgrade recusado.
        // Perguntar o modo é o que separa "preciso entrar" de "estou sem
        // sinal"; sem isso o app diz "sem conexão" e oferece um "Tentar de
        // novo" que nunca vai funcionar (#278).
        if (!token) {
          const modo = await fetchAuthMode(buildHealthzUrl(SYNC_URL));
          // Reconferir depois do await: o socket pode ter sido trocado ou o
          // hook desmontado enquanto a sondagem estava no ar.
          if (currentWsRef.current !== ws || !mountedRef.current) return;
          if (retryTimerRef.current) return;
          if (needsLogin(false, modo)) {
            // Sem retry de propósito: anônimo não entra por mais que insista.
            // Ficar no backoff só gastaria bateria e encheria o log do server
            // de rejeição que nós mesmos causamos.
            setStatus(SYNC_NEEDS_AUTH);
            return;
          }
        }

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
    // tentativa agendada pelo backoff. `waiting` entra porque com SYNC_URL
    // vazio a URL é null antes e depois da sessão resolver, e sem ele o
    // callback não rodaria de novo e o status ficaria preso em `connecting`.
    [url, generation, waiting],
  );

  return useMemo(
    () => ({ status, reconnect: reconnectNow }),
    [status, reconnectNow],
  );
}

// --- Status pra UI (M6, "UI de status de sync") -------------------------

const SyncStatusContext = createContext({
  status: SYNC_OFF,
  reconnect: () => {},
});

/**
 * Roda o sync uma vez e publica o estado pra árvore.
 *
 * Precisa ficar DENTRO do `SessionProvider`: `useRegistrosSync` chama
 * `useSession` por baixo, e acima do provider ele devolveria o default do
 * contexto (`user: null`), e o sync ficaria eternamente anônimo mesmo logado.
 * Foi exatamente o bug do #217.
 *
 * @param {{ children: any }} props
 */
export function SyncStatusProvider({ children }) {
  const value = useRegistrosSync();
  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

/**
 * Estado do sync pra telas. Não abre conexão: só lê o que o provider publica.
 * @returns {{ status: "off"|"connecting"|"online"|"offline", reconnect: () => void }}
 */
export function useSyncStatus() {
  return useContext(SyncStatusContext);
}
