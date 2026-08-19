import { openDatabaseSync } from "expo-sqlite";
import { createExpoSqlitePersister } from "tinybase/persisters/persister-expo-sqlite";
import { useCreatePersister } from "tinybase/ui-react";
import { ensureGoals, ensureSyncRoomId, store } from "./database";

const db = openDatabaseSync("back_on_track.db");

/**
 * Versão native (iOS/Android) de useRegistrosPersistencia, com Expo SQLite.
 * No bundle web o Metro resolve persistence.web.js no lugar deste arquivo,
 * porque o expo-sqlite não é suportado no `expo export` web.
 *
 * Chame este hook uma vez, perto da raiz do app (ex: app/_layout.jsx),
 * pra carregar os dados salvos ao abrir o app e manter tudo persistido
 * automaticamente a cada mudança. Sem isso, a store do TinyBase vive só
 * na memória e some a cada reload, e é o motivo mais provável do app
 * hoje parecer "só visual".
 *
 * Nota: o persister de Expo SQLite ainda é experimental (a própria
 * documentação do TinyBase marca assim), então vale testar bem o ciclo
 * salvar → fechar o app → abrir de novo → dado ainda está lá.
 */
export function useRegistrosPersistencia() {
  useCreatePersister(
    store,
    (store) => createExpoSqlitePersister(store, db, "back_on_track"),
    [],
    async (persister) => {
      await persister.startAutoLoad();
      await persister.startAutoSave();
      // Room ID de sync (M6 fatia 3): só gerar/persistir DEPOIS do autoLoad,
      // senão um roomId gerado vira roomId antigo carregado do SQLite.
      ensureSyncRoomId();
      // Depois do load, mesmo motivo do ensureSyncRoomId acima (#285).
      ensureGoals();
    },
  );
}
