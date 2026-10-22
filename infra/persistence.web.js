import { createLocalPersister } from "tinybase/persisters/persister-browser";
import { useCreatePersister } from "tinybase/ui-react";
import { migrateLocalPrefs } from "@/constants/localPrefs";
import { ensureGoals, ensureSyncRoomId, localStore, store } from "./database";

/**
 * Versão web de useRegistrosPersistencia.
 *
 * O Metro resolve este arquivo (.web.js) no bundle web e usa
 * persistence.js (Expo SQLite) apenas no native. Isso é necessário
 * porque o expo-sqlite depende de um WASM que não é suportado no
 * `expo export` web, e arrastá-lo pro bundle quebra o build da Vercel.
 *
 * Aqui a persistência usa localStorage via createLocalPersister do
 * TinyBase, mantendo o mesmo comportamento: os dados sobrevivem ao
 * reload também na web.
 */
export function useRegistrosPersistencia() {
  useCreatePersister(
    store,
    (store) => createLocalPersister(store, "back_on_track"),
    [],
    async (persister) => {
      await persister.startAutoLoad();
      await persister.startAutoSave();
      // Mesmo motivo da versão native: preferências do aparelho à parte, e a
      // migração só depois de os dois stores carregarem.
      await carregarPreferenciasLocais();
      migrateLocalPrefs(store, localStore);
      // Mesmo motivo da versão native: só gerar syncRoomId depois do autoLoad.
      ensureSyncRoomId();
      // Depois do load, mesmo motivo do ensureSyncRoomId acima (#285).
      ensureGoals();
    },
  );
}

/** @type {ReturnType<typeof createLocalPersister> | null} */
let persisterLocal = null;

/** Ver a versão native. Chave própria no localStorage. */
async function carregarPreferenciasLocais() {
  if (persisterLocal) return;
  persisterLocal = createLocalPersister(localStore, "back_on_track_local");
  await persisterLocal.startAutoLoad();
  await persisterLocal.startAutoSave();
}
