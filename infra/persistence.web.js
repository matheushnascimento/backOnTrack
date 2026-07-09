import { createLocalPersister } from "tinybase/persisters/persister-browser";
import { useCreatePersister } from "tinybase/ui-react";
import { store } from "./database";

/**
 * Versão web de useRegistrosPersistencia.
 *
 * O Metro resolve este arquivo (.web.js) no bundle web e usa
 * persistence.js (Expo SQLite) apenas no native. Isso é necessário
 * porque o expo-sqlite depende de um WASM que não é suportado no
 * `expo export` web — arrastá-lo pro bundle quebra o build da Vercel.
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
    },
  );
}
