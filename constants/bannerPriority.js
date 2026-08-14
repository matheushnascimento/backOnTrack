// @ts-nocheck -- helper puro; tipos vêm quando o componente for tipado (ADR-002)

// Prioridade dos banners do rodapé (#281).
//
// Vive fora do componente pelo mesmo motivo do `sync-url.js` e do
// `sync-retry.js`: importar `UpdateBanner` puxa `infra/sync` → `session` →
// `supabase` → AsyncStorage, que não roda no jest. Isolado aqui, a decisão
// que tem risco de bug fica testável sem mock nenhum.

/**
 * Qual banner mostrar, ou `null` pra nenhum (#281).
 *
 * Pura e exportada pra travar a **ordem** por teste. A ordem é a decisão com
 * risco real aqui: os três de atualização são transitórios e se resolvem
 * sozinhos; o de login persiste até a pessoa entrar. Se `needs-auth` subisse
 * na lista, esconderia por tempo indeterminado avisos que importam mais —
 * inclusive o "reinstale o APK", sem o qual o app nem recebe correção.
 *
 * @param {{
 *   nativeOutdated?: boolean,
 *   isDownloading?: boolean,
 *   isUpdatePending?: boolean,
 *   needsAuth?: boolean,
 *   authDismissed?: boolean,
 * }} estado
 * @returns {"native-outdated"|"downloading"|"update-pending"|"needs-auth"|null}
 */
export function pickBanner({
  nativeOutdated,
  isDownloading,
  isUpdatePending,
  needsAuth,
  authDismissed,
}) {
  if (nativeOutdated) return "native-outdated";
  if (isDownloading) return "downloading";
  if (isUpdatePending) return "update-pending";
  if (needsAuth && !authDismissed) return "needs-auth";
  return null;
}
