// @ts-nocheck -- useSession retorna contexto tipado como never no tsc (ADR-002)
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { useCreateSynchronizer, useValue } from "tinybase/ui-react";
import { SYNC_URL } from "@/constants/sync";
import { store } from "./database";
import { useSession } from "./session";
import { buildSyncUrl } from "./sync-url";

// Re-exporta pra manter API estável (callers antigos podem importar de sync.js).
// A implementação vive em infra/sync-url.js pra ficar testável isolado
// (evita puxar Supabase/AsyncStorage no jest).
export { buildSyncUrl };

/**
 * Conecta o MergeableStore ao server WS de sync.
 *
 * - **Deslogado** (session null): usa `syncRoomId` (UUID por-install) como
 *   pathId, sem `?token=`. É o comportamento pré-auth (M6 fatia 3, #202) —
 *   mantém compat enquanto o server roda em `AUTH_MODE=optional`.
 * - **Logado** (session presente): usa `user.id` como pathId + JWT do Supabase
 *   em `?token=`. Server valida HS256 + enforça `sub === pathId` (fatia B,
 *   #211). Migração dos dados anônimos pra sala do userId acontece
 *   automaticamente na 1ª conexão: MergeableStore CRDT-merge sobe os dados
 *   locais pra sala nova (server-side JSON, [[sync-server-and-cloudflare-tunnel]]).
 *
 * Reconecta em toda troca de `roomId` ou `token` — cobre login, logout, e
 * refresh silencioso do token (Supabase renova em ~1h, dispara
 * `onAuthStateChange('TOKEN_REFRESHED')` que atualiza a session no provider).
 *
 * Depende do `useRegistrosPersistencia` já ter rodado — é ele quem carrega o
 * `syncRoomId` do disco (ou gera no 1º launch). Sem esse gate, o sync abriria
 * numa sala vazia e migraria pra outra assim que o load completasse.
 *
 * Falhas de rede (offline, DNS, TLS) NÃO quebram o app: a persistência local
 * segue funcionando; o sync fica dormente até a próxima abertura. Reconexão
 * automática ficou fora de escopo (o WS do TinyBase não reconecta sozinho; se
 * cair no meio do uso, a próxima abertura sincroniza tudo).
 */
export function useRegistrosSync() {
  const { user, session } = useSession();
  const anonRoomId = useValue("syncRoomId", store);

  // roomId: user.id se logado; senão o UUID anônimo.
  // token: JWT se logado; senão null (server em optional-mode aceita anônimo).
  const roomId = user?.id ?? anonRoomId;
  const token = session?.access_token ?? null;
  const url = buildSyncUrl(SYNC_URL, roomId, token);

  useCreateSynchronizer(
    store,
    async (s) => {
      if (!url) return undefined;
      try {
        // WebSocket é global tanto no RN quanto no web — sem import.
        const ws = new WebSocket(url);
        const sync = await createWsSynchronizer(s, ws);
        await sync.startSync();
        return sync;
      } catch (err) {
        // Não relançar: offline não deve travar o app.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[sync] falhou ao conectar:", msg);
        return undefined;
      }
    },
    // Rerun em qualquer mudança do URL — login/logout muda roomId+token juntos;
    // TOKEN_REFRESHED muda só o token. Ambos precisam de reconexão.
    [url],
  );
}
