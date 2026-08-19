// Navegação "voltar" resiliente a entrada direta na rota.
//
// `router.back()` puro é um NO-OP quando não existe entrada anterior na stack.
// Isso acontece sempre que a rota é o PRIMEIRO destino da sessão:
//
//   - reload do bundle pelo expo-updates (o app volta na rota em que estava,
//     mas com a stack zerada);
//   - refresh do navegador no web (idem);
//   - deep link direto (`backontrack://admin`, magic link do auth);
//   - Fast Refresh no dev.
//
// Nesses casos o botão "Voltar" ficava morto, e o usuário via o controle,
// tocava, e nada acontecia. Aqui a Home vira o destino de fallback: sempre
// existe pra onde voltar.

import { router } from "expo-router";

/**
 * Volta uma tela; se não houver histórico, navega pra Home.
 * @param {string} [fallback] rota alvo quando a stack está vazia
 * @returns {void}
 */
export function goBack(fallback = "/") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
