// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Persistência da preferência de tema (claro/escuro).
//
// O `toggleColorScheme()` do NativeWind vive só em memória: mudava a UI na
// hora, mas qualquer reload (OTA do expo-updates, refresh do navegador, Fast
// Refresh, fechar e abrir o app) voltava pro tema do sistema. Aqui a escolha
// vai pro AsyncStorage e é restaurada no boot.
//
// **Por que AsyncStorage e não o TinyBase store**: o store SINCRONIZA entre
// devices (M6). Tema é preferência POR APARELHO — o celular pode estar no
// escuro à noite enquanto o tablet segue claro. Guardar no store faria uma
// escolha vazar pra outro device. AsyncStorage é local por definição.
//
// **Sem preferência salva = segue o sistema.** Só gravamos quando o usuário
// toca no toggle; até lá o NativeWind fica no default `system` e respeita o
// `prefers-color-scheme` do OS. É a regra 8 do Turno 3 do design v2
// (`docs/09-design-v2.md`): system + override manual em Ajustes.

import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

const THEME_KEY = "backontrack.colorScheme";

/**
 * Salva a escolha explícita do usuário. Erro de escrita não quebra a UI — o
 * tema já mudou em memória; só a persistência falha (e o próximo boot volta
 * pro sistema, que é degradação aceitável).
 * @param {"light" | "dark"} scheme
 * @returns {Promise<void>}
 */
export async function saveThemePreference(scheme) {
  try {
    await AsyncStorage.setItem(THEME_KEY, scheme);
  } catch (e) {
    console.error("[theme] não consegui salvar a preferência:", e);
  }
}

/**
 * Restaura a preferência salva no primeiro render da árvore.
 *
 * O AsyncStorage é assíncrono, então existe um frame curto com o tema do
 * sistema antes da restauração. Não bloqueamos o boot atrás disso (mesma
 * decisão das fontes na fatia 0 do M5-B): travar o splash por causa de um
 * read local custa mais que o flash custa.
 *
 * @returns {void}
 */
export function useRestoreThemePreference() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        // Sem nada salvo = usuário nunca escolheu; deixa no `system`.
        if (cancelled || (saved !== "light" && saved !== "dark")) return;
        setColorScheme(saved);
      })
      .catch((e) => {
        console.error("[theme] não consegui ler a preferência:", e);
      });
    return () => {
      cancelled = true;
    };
    // setColorScheme é estável entre renders (vem do NativeWind); rodar só no
    // mount é o desejado — restauração acontece uma vez por sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
