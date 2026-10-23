// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Timer de exercício e estudo (#369, fatia 2 do #366).
 *
 * ## Guarda o instante de início, e não um contador
 *
 * O tempo decorrido é sempre `agora - início`. Fechar o app, matar o processo
 * ou reiniciar o aparelho não perde nada, porque não há contagem em memória
 * pra perder: na volta, a conta é refeita.
 *
 * ## Parar preenche início e fim, e não a duração
 *
 * Duas datas de relógio são o que a pessoa reconhece ("comecei 18:30, parei
 * 19:30"), e o `reconcileTimes` deriva a duração delas. O timer é só mais um
 * jeito de digitar dois dos três campos da fatia 1.
 *
 * O preço é perder os segundos, e o arredondamento depende de cruzar a virada
 * do minuto: 18:30:50 a 18:31:10 são 20 segundos e viram um minuto, enquanto
 * 10:00:05 a 10:00:50 são 45 e viram zero. A diferença máxima é de um minuto,
 * irrelevante pra registro de hábito, e duração zero não salva.
 *
 * ## Só exercício e estudo
 *
 * O sono fica de fora: ninguém deixa um timer rodando enquanto dorme, e o
 * deitar já tem o atalho "deitar agora". Quem decide é cada tela, que monta ou
 * não o `TimerCard`.
 *
 * ## Fica no aparelho
 *
 * O estado mora no `localStore` (ver `constants/localPrefs.js`). Sincronizado,
 * o site mostraria um timer iniciado no celular, e dois aparelhos disputariam
 * quem para.
 */

import { MAX_SPAN_MIN, horaAgora } from "./timeSpan";

/** Milissegundos desde o início, nunca negativo (relógio do aparelho mudou). */
export function elapsedMs(startedAt, now = Date.now()) {
  return Math.max(0, now - Number(startedAt));
}

/**
 * "12:05" abaixo de uma hora, "1:02:05" a partir dela.
 *
 * Com segundos, porque é o que dá a sensação de que o timer está vivo. Na
 * gravação os segundos somem (ver o topo do arquivo).
 */
export function formatElapsed(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h === 0) return `${m}:${ss}`;
  return `${h}:${String(m).padStart(2, "0")}:${ss}`;
}

/**
 * O que parar o timer escreve nos campos: início e fim em "HH:MM".
 *
 * @returns {{start: string, end: string}}
 */
export function timerStopFields(startedAt, now = Date.now()) {
  return {
    start: horaAgora(new Date(Number(startedAt))),
    end: horaAgora(new Date(now)),
  };
}

/**
 * O timer passou do teto da métrica?
 *
 * É o sinal de timer esquecido: a pessoa começou o estudo e foi dormir. Parar
 * sem perguntar gravaria 9h de estudo. É o mesmo teto de sanidade do #366,
 * aplicado antes de o número virar campo.
 */
export function forgottenTimer({ metric, startedAt, now = Date.now() }) {
  const teto = MAX_SPAN_MIN[metric];
  if (teto == null) return false;
  return elapsedMs(startedAt, now) > teto * 60_000;
}

/**
 * Estado do timer visto de uma tela.
 *
 * Um timer por vez: começar o estudo com o exercício rodando é quase sempre
 * esquecimento do exercício, e a tela precisa dizer isso em vez de começar um
 * segundo.
 *
 * @param {{running: {metric: string, startedAt: number}|null, metric: string}} args
 * @returns {"parado"|"rodando"|"outro"} `outro` = há timer de OUTRA métrica
 */
export function timerStateFor({ running, metric }) {
  if (!running?.metric || !running?.startedAt) return "parado";
  return running.metric === metric ? "rodando" : "outro";
}
