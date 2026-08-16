// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Estado da jornada por níveis (#289, fatia 1).
//
// Deriva de `records` + metas: em que nível a pessoa está e qual o status de
// cada hábito. **Nada aqui muda o uso do app ainda** — o resultado só aparece
// no bloco de diagnóstico em Ajustes → Avançado.
//
// Modelo completo em `docs/11-modelo-de-niveis.md`.

import { GOAL_CADENCE, JOURNEY_ORDER, goalFor } from "./goals";
import {
  consistency,
  dailyVerdicts,
  regularity,
  resilience,
} from "./habitSignals";

/**
 * ⚠️ LIMIARES PROVISÓRIOS — nenhum destes números tem dado que o sustente.
 *
 * A #285 rodou os sinais sobre o histórico real e achou 10 dias de registro:
 * não fecha nem a janela de 28 dias do portão, muito menos uma curva de
 * formação. Estes valores são ponto de partida derivado da literatura
 * (Lally 2010: mediana 66 dias até automaticidade, faixa 18–254), não medida.
 *
 * Ficam juntos de propósito: quando houver dado, calibra-se aqui sem tocar em
 * nenhuma lógica. O mecanismo é testável independente destes valores, e os
 * testes usam dado sintético justamente pra não depender deles.
 */
export const THRESHOLDS = {
  /** Janela de avaliação, em dias. */
  window: 28,

  gate: {
    consistency: 0.8,
    /**
     * Piso de amostra pra regularidade significar alguma coisa.
     *
     * Achado da #285: estudo marcou R=0,99 sobre **2 registros**. Duas
     * amostras sempre parecem concentradas — sem piso, o sinal reporta
     * perfeição espúria e abriria o portão pra quem registrou duas vezes.
     */
    regularityMinSamples: 8,
    /** Desvio circular máximo, em minutos, pra contar como horário estável. */
    regularityMaxSd: 120,
  },

  graduation: {
    consistency: 0.9,
    regularityMinSamples: 16,
    regularityMaxSd: 75,
    /** Recuperou de pelo menos esta fração das falhas isoladas. */
    resilience: 0.75,
  },
};

/** Status possíveis de um hábito na jornada. */
export const LOCKED = "locked";
export const BUILDING = "building";
export const GRADUATED = "graduated";
export const PAUSED = "paused";

/**
 * O hábito passou do portão? (perto de automático)
 *
 * Regularidade só conta com amostra suficiente — ver `regularityMinSamples`.
 * Sem amostra o hábito **não** passa: portão aberto por falta de evidência é
 * pior que portão fechado, porque empilha o próximo hábito em cima de nada.
 */
export function passesGate(signals, limiares = THRESHOLDS) {
  const { gate } = limiares;
  if (signals.consistency.rate < gate.consistency) return false;
  if (signals.regularity.n < gate.regularityMinSamples) return false;
  if (signals.regularity.sdMinutes == null) return false;
  if (signals.regularity.sdMinutes > gate.regularityMaxSd) return false;
  // Falta dupla na janela é o sinal de laço quebrado (§6) — não é "perto de
  // automático" quem ainda desaba dois dias seguidos.
  if (signals.resilience.doubleMisses > 0) return false;
  return true;
}

/**
 * O hábito graduou? (automático — deixa de poder causar regressão)
 *
 * Mesma régua do portão com barra mais alta, nunca "N semanas": prazo fixo
 * contradiz o argumento do próprio portão (§7).
 */
export function passesGraduation(signals, limiares = THRESHOLDS) {
  const { graduation } = limiares;
  if (!passesGate(signals, limiares)) return false;
  if (signals.consistency.rate < graduation.consistency) return false;
  if (signals.regularity.n < graduation.regularityMinSamples) return false;
  if (signals.regularity.sdMinutes > graduation.regularityMaxSd) return false;
  // Quem nunca falhou não tem taxa de recuperação (`null`). Isso NÃO impede
  // graduação — é ausência de queda, não ausência de resiliência.
  if (
    signals.resilience.rate != null &&
    signals.resilience.rate < graduation.resilience
  ) {
    return false;
  }
  return true;
}

/**
 * O hábito quebrou, conforme a cadência dele? (§6 — três regras, não uma)
 *
 * - **diário** → duas faltas consecutivas. Perder um dia custa menos de meio
 *   ponto de automaticidade e recupera rápido (Lally); a segunda falta é onde
 *   o laço quebra.
 * - **semanal** → duas semanas seguidas abaixo do alvo. Aplicar a regra
 *   diária a exercício rebaixaria alguém **por descansar** no fim de semana.
 *
 * @param {Array<{hit: boolean}>} verdicts Cronológico.
 * @param {"daily"|"weekly"} cadence
 * @param {number} [porSemana] Dias no alvo exigidos por semana (cadência semanal).
 */
export function isBroken(verdicts, cadence, porSemana = 3) {
  const v = verdicts ?? [];
  if (cadence === "weekly") {
    // Semana de calendário seria o ideal (§6), mas a janela aqui é relativa a
    // hoje; blocos de 7 dias a partir do fim preservam a semântica de "duas
    // semanas seguidas abaixo do alvo" sem depender de onde cai a segunda.
    const semanas = [];
    for (let fim = v.length; fim > 0; fim -= 7) {
      const bloco = v.slice(Math.max(0, fim - 7), fim);
      if (bloco.length === 7) semanas.push(bloco.filter((d) => d.hit).length);
    }
    // `semanas[0]` é a mais recente.
    return (
      semanas.length >= 2 && semanas[0] < porSemana && semanas[1] < porSemana
    );
  }

  // Diário: duas faltas consecutivas em qualquer ponto da janela recente.
  for (let i = v.length - 1; i > 0; i--) {
    if (!v[i].hit && !v[i - 1].hit) return true;
  }
  return false;
}

/**
 * Estado completo da jornada.
 *
 * ## Por que precisa de `previousLevel`
 *
 * O nível é **derivado dos sinais**: sobe quando o hábito do topo passa o
 * portão. Nesse desenho, "quebrar" já é deixar de passar — a queda é
 * implícita, e olhando só o presente é **impossível distinguir "caiu do lvl 3"
 * de "nunca passou do lvl 2"**.
 *
 * Regressão exige memória. `previousLevel` é o maior nível já alcançado,
 * persistido no store; é a comparação com ele que transforma uma queda em
 * evento — o que a tela 4a·2 do design precisa pra dizer "voltamos pra água".
 *
 * Sem `previousLevel` a função continua correta, só não afirma regressão —
 * é o caso do primeiro uso, onde não há passado pra comparar.
 *
 * ## ⚠️ Quem pausa é o TOPO, não quem quebrou
 *
 * Decisão da #289. Se no lvl 3 a água quebra (mais antiga, não graduada),
 * pausar a água deixaria a alimentação órfã no topo sem base. Pausando o
 * topo, larga-se a carga mais nova e o foco volta pro hábito que está
 * sofrendo — que é a copy do design ("o foco volta pra água por um tempo").
 *
 * @param {{records: Array, goals?: object, now?: number, previousLevel?: number|null, thresholds?: object}} args
 * @returns {{level: number, habits: object, focus: string|null, regressed: boolean}}
 */
export function deriveJourney({
  records,
  goals,
  now = Date.now(),
  previousLevel = null,
  thresholds = THRESHOLDS,
}) {
  const janela = thresholds.window;
  const lista = records ?? [];

  // 1. Sinais de cada hábito, independentes do nível.
  const porMetrica = {};
  for (const metric of JOURNEY_ORDER) {
    const target = goalFor(goals, metric);
    const verdicts = dailyVerdicts(lista, metric, target, janela, now);
    const signals = {
      consistency: consistency(verdicts),
      regularity: regularity(lista, metric, janela, now),
      resilience: resilience(verdicts),
    };
    // `broken` é INFORMATIVO — serve pra explicar por que caiu, não pra
    // derrubar. Quem derruba é o portão. E hábito sem nenhum acerto na janela
    // não está quebrado: não começou.
    const comecou = signals.consistency.hits > 0;
    porMetrica[metric] = {
      signals,
      graduated: passesGraduation(signals, thresholds),
      gated: passesGate(signals, thresholds),
      broken: comecou && isBroken(verdicts, GOAL_CADENCE[metric]),
    };
  }

  // 2. Nível = quantos hábitos, em ordem, passam o portão AGORA. O primeiro
  //    que não passa interrompe a escada — e é o que está sendo construído.
  let gateLevel = 0;
  for (const metric of JOURNEY_ORDER) {
    if (porMetrica[metric].gated) gateLevel += 1;
    else break;
  }
  // O nível exibido inclui o hábito em construção. Teto na quantidade de
  // hábitos: passar por todos não abre um sexto.
  const level = Math.min(gateLevel + 1, JOURNEY_ORDER.length);

  // 3. Regressão só existe contra o passado.
  const regressed = previousLevel != null && level < previousLevel;
  const topo = regressed ? previousLevel : level;

  // 4. Status por hábito.
  const habits = {};
  JOURNEY_ORDER.forEach((metric, i) => {
    const info = porMetrica[metric];
    let status;
    if (i >= topo) status = LOCKED;
    // Entre o nível atual e o antigo: são os que a regressão largou.
    else if (i >= level) status = PAUSED;
    else if (info.graduated) status = GRADUATED;
    else status = BUILDING;
    habits[metric] = { status, ...info };
  });

  // Foco = o hábito em construção — o card grande da Home (fatia 2).
  const focus =
    JOURNEY_ORDER.slice(0, level)
      .filter((m) => habits[m].status === BUILDING)
      .pop() ?? null;

  return { level, habits, focus, regressed };
}
