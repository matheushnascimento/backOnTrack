// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Higiene do sono pelo método 10-3-2-1-0, em escada (#396, fatia 1).
//
// O sono deixa de ser o hábito: o desfecho (quanto dormiu) não se forma, o que
// se forma é o que a pessoa faz antes de deitar. As cinco regras contam a
// partir de um horário-alvo de deitar que ela escolhe, e o modelo forma UMA
// por vez: começa pela que a pessoa escolher, e a próxima entra quando a
// anterior estiver consistente. Ver `docs/11-modelo-de-niveis.md` §4.3.
//
// Decisões de 27/10 (comentário na #396):
//
// - A primeira regra consistente passa o portão do nível 1 e libera a água.
//   As seguintes sobem em paralelo e não derrubam nível.
// - A escada tem limiar próprio, mais leve que o do portão (`LIMIAR_DA_ESCADA`).
// - A regra 0 (soneca) é marcada à noite, sobre o dia que passou, junto das
//   outras: uma ocasião e um momento de registro por noite.
//
// O ritual cumprido é um registro do tipo `sleep`, com `regra` e `at` (o
// horário em que a pessoa cumpriu) no `details`, e sem duração.

import {
  consistency,
  diaLocal,
  dispersaoCircular,
  resilience,
} from "./habitSignals";
import { campoDoRegistro, parseHHMM } from "./sleepTimes";

const MS_MIN = 60_000;
const MS_DIA = 86_400_000;

/**
 * As cinco regras, na ordem do método.
 *
 * `antes` é quantos minutos antes do horário-alvo a regra passa a valer. A
 * regra 0 não tem prazo de relógio: vale o dia todo.
 */
export const REGRAS = [
  { key: "10", titulo: "Sem cafeína", antes: 600 },
  { key: "3", titulo: "Sem comida pesada nem álcool", antes: 180 },
  { key: "2", titulo: "Sem trabalho", antes: 120 },
  { key: "1", titulo: "Sem telas", antes: 60 },
  { key: "0", titulo: "Nenhuma soneca", antes: null },
];

const POR_CHAVE = Object.fromEntries(REGRAS.map((r) => [r.key, r]));

/** A regra existe? */
export function isRegra(key) {
  return Object.prototype.hasOwnProperty.call(POR_CHAVE, String(key));
}

/**
 * ⚠️ LIMIAR PROVISÓRIO, como os de `constants/journey.js`.
 *
 * Mais leve que o portão de nível de propósito (decisão de 27/10): com a barra
 * do portão, cada regra levaria umas quatro semanas, e as cinco quase meio ano.
 * Mesma família de sinal, janela de 14 dias. Calibra-se aqui quando houver
 * dado, sem tocar em lógica.
 */
export const LIMIAR_DA_ESCADA = {
  /** Janela, em noites. */
  window: 14,
  consistency: 0.8,
  regularityMinSamples: 8,
  regularityMaxSd: 120,
};

/** "HH:MM" a partir de minutos, dando a volta no relógio. */
function relogio(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Até que horas a regra deixa a coisa liberada, com o deitar no `alvo`.
 *
 * Com deitar às 23:00, a regra 10 dá "13:00": cafeína até 13h. Dá a volta na
 * meia-noite: deitar às 02:00 põe a regra 3 às 23:00 do dia anterior.
 *
 * @param {string} regra
 * @param {string} alvo "HH:MM"
 * @returns {string|null} `null` pra regra 0, que não tem prazo, ou entrada inválida.
 */
export function prazoDaRegra(regra, alvo) {
  const r = POR_CHAVE[regra];
  const min = parseHHMM(alvo);
  if (!r || r.antes == null || min == null) return null;
  return relogio(min - r.antes);
}

/**
 * A regra como a pessoa lê, com o horário dela.
 *
 * @param {string} regra
 * @param {string} alvo "HH:MM"
 * @returns {string} vazio se a regra não existe.
 */
export function textoDaRegra(regra, alvo) {
  const r = POR_CHAVE[regra];
  if (!r) return "";
  if (r.antes == null) return "Nenhuma soneca durante o dia";
  const prazo = prazoDaRegra(regra, alvo);
  return prazo ? `${r.titulo} depois das ${prazo}` : r.titulo;
}

/**
 * A regra e o horário do ritual de um registro, se ele for um ritual.
 *
 * Lê a linha crua do `useTable` e a hidratada, pela mesma razão do `bedOf`.
 *
 * @returns {{regra: string, at: string|null}|null}
 */
export function ritualDe(registro) {
  if (registro?.type !== "sleep") return null;
  const regra = campoDoRegistro(registro, "regra");
  if (!isRegra(regra)) return null;
  const at = campoDoRegistro(registro, "at");
  return { regra: String(regra), at: parseHHMM(at) == null ? null : at };
}

/**
 * Onde termina a noite: 6 horas depois do horário-alvo.
 *
 * A noite de um ritual é a do dia em que a pessoa vai deitar. A fronteira não
 * pode ser a meia-noite: quem deita às 23:00 e larga as telas às 00:10 ainda
 * está na mesma noite. Nem as 18h do `nightInstant`: a regra 10 vence de tarde
 * e a pessoa marca de tarde. Seis horas depois do alvo cobre quem passa um
 * pouco do horário e não alcança a tarde do dia seguinte.
 */
function fronteiraEmMs(alvo) {
  // Módulo 24h: alvo 23:00 põe a fronteira às 05:00, e não 29 horas depois.
  return (((parseHHMM(alvo) ?? 0) + 360) % 1440) * MS_MIN;
}

/** O dia-calendário da noite a que um instante pertence. */
function noiteDe(ms, alvo) {
  return diaLocal(ms - fronteiraEmMs(alvo));
}

/**
 * O instante em que o ritual aconteceu: a ocorrência do `at` mais perto do
 * registro, até 12 horas pra trás ou pra frente. Sem `at`, o próprio registro.
 *
 * A mais perto, e não a mais recente como no `nightInstant`, por causa da
 * edição: quem tocou "cumpri" às 22:00 e corrigiu pra 23:30 está falando da
 * mesma noite, e "a última 23:30 antes das 22:00" seria a da véspera. E quem
 * esqueceu, marcou às 07:00 e corrigiu pra 22:00 fala da noite anterior, que
 * é a ocorrência mais perto.
 */
function instanteDoRitual(registro, at) {
  const ts = Number(registro?.createdAt);
  if (!Number.isFinite(ts)) return null;
  const min = parseHHMM(at);
  if (min == null) return ts;
  const d = new Date(ts);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  if (d.getTime() - ts > MS_DIA / 2) d.setDate(d.getDate() - 1);
  else if (ts - d.getTime() > MS_DIA / 2) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * A noite de um ritual, como chave "AAAA-MM-DD".
 *
 * @returns {string|null}
 */
export function noiteDoRitual(registro, alvo) {
  const ritual = ritualDe(registro);
  if (!ritual) return null;
  const ms = instanteDoRitual(registro, ritual.at);
  return ms == null ? null : noiteDe(ms, alvo);
}

/**
 * Veredito de uma regra por noite, da mais antiga pra mais recente.
 *
 * Mesmo formato do `dailyVerdicts`, pra `consistency` e `resilience` lerem
 * sem adaptação. Noite antes de a regra começar entra como falta: a janela só
 * passa a valer inteira depois de `window` noites na regra, que é o tempo
 * mínimo que se quer mesmo.
 *
 * @returns {Array<{dia: string, hit: boolean}>}
 */
export function veredictosDaRegra(
  records,
  regra,
  alvo,
  days,
  now = Date.now(),
) {
  const cumpridas = new Set();
  for (const r of records ?? []) {
    if (ritualDe(r)?.regra !== regra) continue;
    const noite = noiteDoRitual(r, alvo);
    if (noite) cumpridas.add(noite);
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dia = noiteDe(now - i * MS_DIA, alvo);
    out.push({ dia, hit: cumpridas.has(dia) });
  }
  return out;
}

/**
 * Os três sinais de uma regra, na janela da escada.
 *
 * A regularidade é a do horário do ritual (`at`), e não a do deitar: o
 * contexto que se repete agora é o momento em que a pessoa cumpre a regra.
 */
export function sinaisDaRegra(
  records,
  regra,
  alvo,
  now = Date.now(),
  limiar = LIMIAR_DA_ESCADA,
) {
  const veredictos = veredictosDaRegra(
    records,
    regra,
    alvo,
    limiar.window,
    now,
  );
  const naJanela = new Set(veredictos.map((v) => v.dia));
  const minutos = [];
  for (const r of records ?? []) {
    const ritual = ritualDe(r);
    if (ritual?.regra !== regra || ritual.at == null) continue;
    if (naJanela.has(noiteDoRitual(r, alvo)))
      minutos.push(parseHHMM(ritual.at));
  }
  return {
    consistency: consistency(veredictos),
    regularity: dispersaoCircular(minutos),
    resilience: resilience(veredictos),
  };
}

/**
 * A regra está consistente? É o que libera a próxima.
 *
 * Mesmas três perguntas do `passesGate`, com o limiar da escada.
 */
export function regraConsistente(sinais, limiar = LIMIAR_DA_ESCADA) {
  if (sinais.consistency.rate < limiar.consistency) return false;
  if (sinais.regularity.n < limiar.regularityMinSamples) return false;
  if (sinais.regularity.sdMinutes == null) return false;
  if (sinais.regularity.sdMinutes > limiar.regularityMaxSd) return false;
  if (sinais.resilience.doubleMisses > 0) return false;
  return true;
}

/**
 * Os degraus gravados, do mais antigo pro mais novo.
 *
 * Tabela `hygieneSteps`, uma linha por regra, com a regra como id. Linha e não
 * valor único pelo mesmo motivo dos pacotes de chave: dois aparelhos mexendo
 * ao mesmo tempo juntam célula por célula em vez de um apagar o outro.
 *
 * @returns {Array<{regra: string, startedAt: number, conqueredAt: number|null}>}
 */
export function degrausDaTabela(tabela) {
  return Object.entries(tabela ?? {})
    .filter(([regra, row]) => isRegra(regra) && Number(row?.startedAt) > 0)
    .map(([regra, row]) => ({
      regra,
      startedAt: Number(row.startedAt),
      conqueredAt: Number(row.conqueredAt) > 0 ? Number(row.conqueredAt) : null,
    }))
    .sort(
      (a, b) => a.startedAt - b.startedAt || a.regra.localeCompare(b.regra),
    );
}

/**
 * Onde a pessoa está na escada.
 *
 * - `configurada`: tem horário-alvo e já escolheu a primeira regra. Antes
 *   disso o sono segue como era, e as noites com "deitou" contam (transição).
 * - `ativa`: a regra que se cumpre toda noite. `null` quando nenhuma começou,
 *   ou quando a anterior foi conquistada e a próxima ainda não foi escolhida.
 * - `pronta`: a ativa já está consistente e pode ser conquistada.
 *
 * Conquista não se perde: a regra formada sai da lista da noite, e cobrar de
 * volta seria a lista de tarefas que o §1.5 recusa.
 *
 * Se uma corrida entre aparelhos deixar duas regras ativas, vale a mais
 * antiga, que é a que tem mais noites acumuladas.
 */
export function estadoDaEscada({
  alvo,
  degraus,
  records,
  now = Date.now(),
  limiar = LIMIAR_DA_ESCADA,
}) {
  const lista = degraus ?? [];
  const conquistadas = lista.filter((d) => d.conqueredAt).map((d) => d.regra);
  const ativa = lista.find((d) => !d.conqueredAt)?.regra ?? null;
  const iniciadas = new Set(lista.map((d) => d.regra));
  const disponiveis = REGRAS.map((r) => r.key).filter((k) => !iniciadas.has(k));
  const alvoValido = parseHHMM(alvo) != null;
  const sinais =
    ativa && alvoValido
      ? sinaisDaRegra(records, ativa, alvo, now, limiar)
      : null;

  return {
    alvo: alvoValido ? alvo : null,
    configurada: alvoValido && lista.length > 0,
    desde: lista[0]?.startedAt ?? null,
    ativa,
    conquistadas,
    disponiveis,
    sinais,
    pronta: sinais ? regraConsistente(sinais, limiar) : false,
    completa: conquistadas.length === REGRAS.length,
  };
}

/**
 * A pessoa pode começar esta regra agora?
 *
 * Só sem regra ativa, que é o "uma por vez", e só regra ainda não iniciada.
 */
export function podeComecar(estado, regra) {
  return (
    Boolean(estado?.alvo) &&
    !estado.ativa &&
    isRegra(regra) &&
    (estado.disponiveis ?? []).includes(String(regra))
  );
}

/**
 * Sugestão de horário-alvo: o deitar típico das últimas noites, arredondado
 * pra baixo em 15 minutos.
 *
 * Arredondar pra baixo puxa o alvo um pouco mais cedo, nunca mais tarde. É só
 * o valor inicial do campo; quem decide é a pessoa.
 *
 * @param {number|null|undefined} deitarTipico Minutos desde a meia-noite, o
 *   `bed` do `typicalSleepTimes`.
 * @returns {string} "23:00" quando não há histórico.
 */
export function sugerirAlvo(deitarTipico) {
  const min = Number.isFinite(deitarTipico) ? Math.round(deitarTipico) : null;
  if (min == null) return "23:00";
  return relogio(min - (min % 15));
}
