import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { useCreateSynchronizer, useValue } from "tinybase/ui-react";
import { SYNC_URL } from "@/constants/sync";
import { store } from "./database";

/**
 * Conecta o MergeableStore ao server WS de sync (M6 fatia 3, #202).
 *
 * Depende do `useRegistrosPersistencia` já ter rodado — é ele quem carrega o
 * `syncRoomId` do disco (ou gera no 1º launch). Sem esse gate, o sync abriria
 * numa sala vazia e migraria pra outra assim que o load completasse.
 *
 * Falhas de rede (offline, DNS, TLS) NÃO quebram o app: a persistência local
 * segue funcionando; o sync fica dormente até a próxima abertura. Reconexão
 * automática ficou fora de escopo desta fatia (o WS do TinyBase não reconecta
 * sozinho; se cair no meio do uso, a próxima abertura sincroniza tudo).
 *
 * Chame perto da raiz (app/_layout.jsx), depois de useRegistrosPersistencia.
 */
export function useRegistrosSync() {
  const roomId = useValue("syncRoomId", store);
  const enabled = Boolean(SYNC_URL) && Boolean(roomId);

  useCreateSynchronizer(
    store,
    async (s) => {
      if (!enabled) return undefined;
      // `enabled` já garante roomId truthy, mas TS não estreita cross-closure.
      const url = `${SYNC_URL}/${encodeURIComponent(String(roomId))}`;
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
    [enabled, roomId],
  );
}
