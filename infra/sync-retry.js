// @ts-nocheck -- helper puro; tipos vêm quando toda a infra/ for tipada (ADR-002)

/**
 * Backoff exponencial com full jitter pro reconnect do sync WS.
 *
 * Isolado num arquivo próprio pelo mesmo motivo do `sync-url.js`: é lógica
 * pura, testável sem puxar `infra/sync.js` (que importa Supabase/AsyncStorage
 * e não roda no jest).
 *
 * **Por que jitter:** quando o server reinicia, todos os clientes caem no
 * mesmo instante. Sem jitter eles voltam juntos no mesmo milissegundo e
 * derrubam de novo (thundering herd). Full jitter espalha cada cliente por
 * uma janela aleatória: sorteia em `[delay/2, delay]` em vez de sempre usar
 * o teto.
 */

export const BASE_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Delay até a próxima tentativa.
 *
 * Progressão sem jitter: 1s, 2s, 4s, 8s, 16s, 30s, 30s… (teto em 30s pra a
 * reconexão não ficar minutos parada depois de uma queda longa).
 *
 * @param {number} attempt Tentativas já falhadas (0 = primeira retentativa).
 * @param {{ base?: number, max?: number, random?: () => number }} [opts]
 * @returns {number} Milissegundos a esperar.
 */
export function retryDelay(attempt, opts = {}) {
  const {
    base = BASE_RETRY_DELAY_MS,
    max = MAX_RETRY_DELAY_MS,
    random = Math.random,
  } = opts;
  const n = Math.max(0, Math.floor(Number(attempt) || 0));
  // 2**n cresce rápido; capar ANTES do jitter evita overflow em n alto.
  const capped = Math.min(max, base * 2 ** Math.min(n, 30));
  // Full jitter na metade de cima: mantém progressão perceptível sem
  // sincronizar clientes.
  return Math.round(capped * (0.5 + 0.5 * random()));
}
