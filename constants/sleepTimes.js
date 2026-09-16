// @ts-nocheck -- helper puro; tipos vêm quando constants/ for tipado (ADR-002)

// Horários de dormir e acordar (#328).
//
// A tela de sono sempre pediu "deitou" e "acordou", mas gravava só a duração
// que eles produzem. Os horários morriam no submit, e por isso a edição só
// conseguia oferecer duração: o dado não existia pra ser editado.
//
// Agora `bed` e `wake` vão pro `details` do registro. A duração continua sendo
// gravada em `quantity`, porque é ela que alimenta metas, sinais e o total do
// dia, e nada disso deve ter que reparsear horário.
//
// ⚠️ **Todo registro anterior a esta mudança não tem os campos.** Isso não é
// caso de borda, é a maioria do histórico, e a edição precisa continuar
// funcionando neles. Quem decide é `timesFrom`, que devolve `null` e manda a
// tela cair no formulário de duração.

const DIA_MIN = 1440;

/**
 * Teto de plausibilidade pra uma noite, em minutos (#353).
 *
 * Sono muito longo, por doença ou recuperação, chega a 12 ou 14 horas. 16
 * fica acima do legítimo e abaixo do absurdo, e o absurdo aqui tem uma forma
 * só: horários invertidos. Deitar 23:00 e acordar 22:00 dá 23 horas, e o app
 * aceitava isso em silêncio.
 */
export const MAX_NOITE_MIN = 16 * 60;

/**
 * "23:40" em minutos desde a meia-noite, ou `null`.
 *
 * Estrito de propósito. O `hhmmToMinutes` de `constants/duration.js` devolve 0
 * pra entrada inválida, o que serve pra somar duração e atrapalha aqui: 0 é um
 * horário legítimo (meia-noite), então "não consegui ler" precisa ser `null`.
 *
 * @param {string|null|undefined} hhmm
 * @returns {number|null}
 */
export function parseHHMM(hhmm) {
  if (typeof hhmm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * O horário de deitar de um registro, em qualquer dos dois formatos.
 *
 * O `bed` não é coluna da tabela `records`: mora dentro do JSON `details`.
 * Quem lê via `getToday`/`getById` recebe o registro **hidratado**, com o
 * `bed` espalhado no topo. Quem lê via `useTable("records")` recebe a linha
 * **crua**, com o `bed` preso no `details`. Os sinais da jornada leem a crua.
 *
 * Ler só `registro.bed` funcionava nos testes, que montavam o formato
 * hidratado, e devolvia `undefined` no app. Foi assim que a regularidade por
 * horário de deitar (#344) e a atribuição da noite ao dia (#355) ficaram sem
 * efeito em produção com a suíte verde.
 *
 * @param {{bed?: string, details?: string}|null|undefined} registro
 * @returns {string|undefined} o "HH:MM" como gravado, sem validar
 */
export function bedOf(registro) {
  if (registro?.bed != null) return registro.bed;
  const details = registro?.details;
  if (typeof details !== "string" || details === "") return undefined;
  try {
    return JSON.parse(details)?.bed;
  } catch {
    return undefined;
  }
}

/**
 * Duração entre deitar e acordar, atravessando a meia-noite.
 *
 * Dormir 23:40 e acordar 07:00 são 7h20, e não um número negativo. O módulo
 * resolve isso. Duração zero devolve `null`, porque deitar e acordar no mesmo
 * minuto não é uma noite.
 *
 * @param {string} bed
 * @param {string} wake
 * @returns {number|null} minutos
 */
export function durationFromTimes(bed, wake) {
  const b = parseHHMM(bed);
  const w = parseHHMM(wake);
  if (b == null || w == null) return null;
  const dur = (w - b + DIA_MIN) % DIA_MIN;
  return dur > 0 ? dur : null;
}

/**
 * Os horários de um registro, quando ele os tem.
 *
 * `null` para registro antigo, que guardou só a duração. É esse `null` que faz
 * a edição oferecer o formulário certo em vez de mostrar dois campos vazios e
 * fingir que o dado existe.
 *
 * ⚠️ **Quem manda é o `bed` sozinho** (#349). Desde que o deitar virou o único
 * campo obrigatório, existe registro com deitar e sem acordar, e ele precisa
 * abrir no formulário de horário. Exigir os dois aqui mandaria esse registro
 * pro formulário de duração, que é justamente o dado que ele não tem.
 *
 * `wake` volta como string vazia quando não existe, e a tela trata isso como
 * campo opcional em branco.
 *
 * @param {{bed?: string, wake?: string}|null|undefined} registro
 * @returns {{bed: string, wake: string}|null}
 */
export function timesFrom(registro) {
  const bed = registro?.bed;
  if (parseHHMM(bed) == null) return null;
  const wake = registro?.wake;
  return { bed, wake: parseHHMM(wake) == null ? "" : wake };
}

/**
 * O horário de deitar mais recente de uma lista de registros (#349).
 *
 * Serve pra Home ter o que mostrar quando o registro tem só o deitar. Sem
 * isso ela formataria duração zero como "0:00", que lê como falha justamente
 * pra quem registrou o comportamento direito.
 *
 * ⚠️ Isto é remendo de fatia. Centrar a Home no comportamento em vez da
 * quantidade pertence à fatia das ocasiões, que mexe no `dailyVerdicts`.
 *
 * @param {Array<{bed?: string, createdAt?: number}>} registros
 * @returns {string|null}
 */
export function latestBed(registros) {
  let melhor = null;
  let quando = -Infinity;
  for (const r of registros ?? []) {
    if (parseHHMM(r?.bed) == null) continue;
    const ts = Number(r?.createdAt) || 0;
    if (ts >= quando) {
      quando = ts;
      melhor = r.bed;
    }
  }
  return melhor;
}

/**
 * O problema do par de horários, quando há um (#353).
 *
 * ⚠️ **A regra NÃO é "acordar depois de deitar".** Quem deita 23:40 e acorda
 * 07:00 tem o acordar numericamente menor, e essa é a noite típica: é por isso
 * que a duração atravessa a meia-noite por módulo. Comparar os dois números
 * rejeitaria o caso mais comum do app.
 *
 * O que dá pra detectar é **duração implausível**, que é como a inversão
 * aparece. Ver `MAX_NOITE_MIN`.
 *
 * Devolve `null` quando não há o que reclamar, inclusive quando o acordar está
 * vazio: deitar sozinho é registro válido (§4.2).
 *
 * @param {string} bed
 * @param {string} wake
 * @returns {string|null} mensagem pra tela
 */
export function sleepTimeIssue(bed, wake) {
  if (parseHHMM(wake) == null) return null;
  const dur = durationFromTimes(bed, wake);
  if (dur == null) return null;
  if (dur <= MAX_NOITE_MIN) return null;
  const horas = Math.round(dur / 60);
  return `Isso daria ${horas}h deitado. Confere se os horários não estão trocados.`;
}

/**
 * A que dia pertence a noite de um registro de sono (#355).
 *
 * ## Não existe convenção
 *
 * Levantamento de plataformas: Fitbit usa o dia em que o sono terminou, Oura
 * usa fronteira às 18h, Garmin usa o dia do despertar, WHOOP abandona o
 * calendário, e Apple e Google não definem nada. Cinco dão quatro respostas.
 * Isto aqui é **escolha documentada**, e não convenção herdada.
 *
 * ## A regra, em duas etapas
 *
 * 1. **Instante do deitar**: a ocorrência mais recente do horário informado,
 *    em ou antes do `createdAt`. É isso que torna o resultado independente de
 *    quando a pessoa registrou, que é o defeito a corrigir.
 * 2. **Fronteira das 18h**: o dia de sono vai das 18h às 18h.
 *
 * A segunda etapa existe por um furo do óbvio. Atribuir ao dia do início puro
 * quebra pra quem oscila em torno da meia-noite: domingo 23h50 conta domingo,
 * segunda 00h10 contaria terça, e **segunda ficaria vazia** mesmo tendo
 * dormido. É exatamente a população que a estatística circular do §5 trata.
 *
 * `null` quando não dá pra derivar, e aí quem chama cai no `createdAt`. Isso
 * cobre todo registro anterior ao #328, que não tem `bed`.
 *
 * @param {{bed?: string, createdAt?: number}} registro
 * @returns {number|null} epoch ms de um instante DENTRO do dia de sono
 */
export function nightInstant(registro) {
  const min = parseHHMM(bedOf(registro));
  if (min == null) return null;
  const ts = Number(registro?.createdAt);
  if (!Number.isFinite(ts) || ts <= 0) return null;

  // Ocorrência mais recente do horário em ou antes do registro.
  const d = new Date(ts);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  if (d.getTime() > ts) d.setDate(d.getDate() - 1);

  // Fronteira das 18h: antes disso, a noite pertence ao dia anterior.
  if (d.getHours() < 18) d.setDate(d.getDate() - 1);
  return d.getTime();
}
