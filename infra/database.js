// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { createMergeableStore, createStore } from "tinybase";

import { DEFAULT_GOALS } from "@/constants/goals";
import { LOCAL_PREFS_SCHEMA } from "@/constants/localPrefs";
import { maisRecentesPrimeiro } from "@/constants/recordOrder";
import { degrausDaTabela } from "@/constants/sleepHygiene";
import { withTimeOfDay } from "@/constants/recordTime";

const TABLE = "records";
const TESTERS = "testers";
const GOALS = "goals";
const E2E_KEYS = "e2eKeys";
const HYGIENE_STEPS = "hygieneSteps";

// MergeableStore em vez de Store puro: pré-requisito de qualquer sync (M6,
// ADR-009). Carrega metadata de CRDT pra merge determinístico entre devices.
// Persisters atuais (expo-sqlite em modo JSON, browser localStorage) já
// suportam MergeableStore sem mudar. Ver docs/03-decisoes-tecnicas.md.
export const store = createMergeableStore()
  .setTablesSchema({
    [TABLE]: {
      type: { type: "string" },
      date: { type: "string" },
      quantity: { type: "number" },
      unit: { type: "string" },
      note: { type: "string" },
      details: { type: "string", default: "{}" },
      createdAt: { type: "number" },
    },
    // Lista de testers da tela de admin (Track A do M3-5). Local por-device;
    // só o aparelho do admin popula. Ver app/admin.jsx.
    [TESTERS]: {
      name: { type: "string" },
      phone: { type: "string" },
      createdAt: { type: "number" },
    },
    // Metas por métrica (#285, fatia 0 do modelo de níveis). rowId = a
    // métrica ("water", "sleep", …). Antes disto as metas eram texto fixo em
    // Ajustes: não existiam como dado, e o portão de nível não fecha sem
    // elas. Ver docs/11-modelo-de-niveis.md §10.
    [GOALS]: {
      target: { type: "number" },
      updatedAt: { type: "number" },
    },
    // Pacotes de chave da criptografia ponta a ponta (#388). Um por linha, com
    // o `kid` como id, e NUNCA num valor único: criar acrescenta e não
    // sobrescreve, então uma corrida de criação entre aparelhos deixa duas
    // chaves em vez de tornar uma ilegível. O pacote sincroniza de propósito,
    // porque é trancado: sem a senha ou o código, não serve pra nada. Ver
    // `constants/e2eKeyring.js`.
    [E2E_KEYS]: {
      bundle: { type: "string" },
      createdAt: { type: "number" },
    },
    // Degraus da escada da higiene do sono (#396). Uma linha por regra, com a
    // regra ("10", "3", "2", "1") como id. Linha e não valor único: dois
    // aparelhos mexendo ao mesmo tempo juntam célula por célula. Conquista só
    // se escreve, nunca se apaga. Ver `constants/sleepHygiene.js`.
    [HYGIENE_STEPS]: {
      startedAt: { type: "number" },
      conqueredAt: { type: "number" },
    },
  })
  .setValuesSchema({
    // Room ID por install pra sync WS (M6 fatia 3, #202). Gerado no 1º launch
    // (ver infra/persistence.js). Default vazio = sync ainda não inicializado.
    syncRoomId: { type: "string", default: "" },
    // ⚠️ LEGADO, só pra migração (ver `constants/localPrefs.js`). Lembretes e
    // prévias de dev são do APARELHO e moram no `localStore`, que não
    // sincroniza. Ficam declarados aqui pra que o valor antigo ainda carregue
    // do disco e possa ser copiado, e SEM default de propósito: com default, o
    // `delValue` da migração não apaga, só volta ao padrão, e o padrão seguiria
    // viajando pela sala da conta.
    reminderEnabled: { type: "boolean" },
    reminderTime: { type: "string" },
    sleepReminderEnabled: { type: "boolean" },
    journeyDemoLevel: { type: "number" },
    retomadaDemo: { type: "boolean" },

    // Como o usuário quer ser chamado no cumprimento da Home. Preferido em
    // relação à derivação do email, que quando presente cai no primeiro nome
    // (antes do primeiro ponto). Editável em Ajustes.
    displayName: { type: "string", default: "" },
    // Maior nível já alcançado na jornada (#289). É a MEMÓRIA que torna
    // regressão detectável: o nível atual é derivado dos sinais, e olhando só
    // o presente não dá pra distinguir "caiu do lvl 3" de "nunca passou do 2".
    // Só sobe, porque cair é justamente o que se quer poder detectar.
    journeyPeakLevel: { type: "number", default: 0 },
    // Nível que o usuário já VIU e reconheceu (#293). Diferente do peak:
    // o peak dirige o estado (o que aparece "em pausa" na Home, de forma
    // persistente), o ack dirige o momento (aparece uma vez e some). Se o ack
    // governasse o estado, hábito pausado viraria trancado no instante em que
    // a pessoa tocasse "Entendi", e o design mostra "em pausa" DEPOIS disso.
    // -1 = nunca reconheceu nada, pra distinguir de "reconheceu o lvl 0".
    journeyAckLevel: { type: "number", default: -1 },
    // Hábitos graduados por CONFERÊNCIA do histórico (#295), separados por
    // vírgula. Graduar normalmente exige a barra alta e semanas de observação;
    // pular concede com a evidência do portão: mesma exigência, sem espera.
    // Persistido porque a derivação olha só a janela atual e esqueceria.
    journeyGranted: { type: "string", default: "" },
    // Quando cada hábito ficou estável (#297), como `metric:epoch` separado
    // por vírgula. A graduação é DERIVADA dos sinais, e o app sabe que o hábito
    // é estável, não desde quando. Sem esta data não dá pra dizer "estável há
    // 24 dias". Some quando o hábito deixa de ser estável, pra recomeçar a
    // contagem se ele for reconquistado.
    journeyGraduatedAt: { type: "string", default: "" },
    // Horário-alvo de deitar da higiene do sono (#396), "HH:MM". É dele que
    // saem os horários das quatro regras. Vazio = método não configurado.
    hygieneTarget: { type: "string", default: "" },
  });

// Preferências do APARELHO (lembretes, prévias de dev). Store comum, e não
// mergeable, e fora do synchronizer: o que mora aqui não viaja pra sala da
// conta. Persistido à parte pelo `useRegistrosPersistencia`. Ver
// `constants/localPrefs.js`.
//
// O porquê das duas prévias, que vieram do schema principal:
//
// - `journeyDemoLevel` (#293): os momentos de nível são inobserváveis com
//   histórico curto, e afrouxar os limiares mudaria o portão. Forçar o nível
//   testa a TELA; o modelo segue testado por `tests/journey.test.js`. Enquanto
//   ligado, o peak NÃO sobe, senão sair do demo deixaria o app "regredido".
// - `retomadaDemo` (#320): a retomada depende de 3+ dias sem registro, que
//   quem usa o app todo dia não produz sem apagar os próprios dados.
export const localStore = createStore().setValuesSchema(LOCAL_PREFS_SCHEMA);

// Espalha `details` (JSON) de volta pro topo. É espalhado por último de
// propósito: registros antigos (schema frouxo, com quantity/observation
// dentro de details) continuam aparecendo achatados, dando fallback pros
// campos que hoje viraram coluna própria.
function hidratar(id, linha) {
  const { details, ...resto } = linha;
  let extras;
  try {
    extras = JSON.parse(details || "{}");
  } catch {
    extras = {};
  }
  return { id, ...resto, ...extras };
}

// Separa os campos unificados (colunas) dos extras específicos do tipo
// (serializados em details).
function buildRow(type, data) {
  const { date, quantity, unit, note, ...extras } = data;
  return {
    type,
    date: date ?? "",
    quantity: Number(quantity) || 0,
    unit: unit ?? "",
    note: note ?? "",
    details: JSON.stringify(extras ?? {}),
    createdAt: Date.now(),
  };
}

export function add(type, data) {
  store.addRow(TABLE, buildRow(type, data));
}

export function update(id, data) {
  const { quantity, unit, note, ...rest } = data;
  const extras = { ...rest };
  // A data não é editável na UI (é sempre "hoje"); não mexer nela aqui,
  // senão editar um registro antigo trocaria a data original pela de hoje.
  delete extras.date;
  store.setPartialRow(TABLE, id, {
    quantity: Number(quantity) || 0,
    unit: unit ?? "",
    note: note ?? "",
    details: JSON.stringify(extras),
  });
}

/**
 * Corrige a HORA de um registro, mantendo o dia (#336).
 *
 * Caminho próprio de propósito. O `update` não toca em timestamp, e essa
 * guarda existe pra que editar um registro antigo não o traga pra hoje. Aqui
 * o objetivo é justamente mexer no tempo, então a operação fica explícita e
 * estreita: só hora e minuto, só no dia que o registro já tinha.
 *
 * O `createdAt` é o campo certo porque é o que todo consumidor já trata como
 * hora do evento, inclusive o sinal de regularidade da jornada.
 *
 * @param {string} id
 * @param {string} hhmm "HH:MM"
 * @returns {boolean} `false` quando a hora não lê, e nada é gravado.
 */
export function setRecordTime(id, hhmm) {
  if (!store.hasRow(TABLE, id)) return false;
  const atual = Number(store.getCell(TABLE, id, "createdAt")) || 0;
  const novo = withTimeOfDay(atual, hhmm);
  if (novo == null) return false;
  store.setCell(TABLE, id, "createdAt", novo);
  return true;
}

export function remove(id) {
  store.delRow(TABLE, id);
}

export function getById(id) {
  if (!store.hasRow(TABLE, id)) return undefined;
  return hidratar(id, store.getRow(TABLE, id));
}

export function get(type) {
  const linhas = store.getTable(TABLE);
  const resultado = {};
  for (const [id, linha] of Object.entries(linhas)) {
    if (linha.type === type) {
      resultado[id] = hidratar(id, linha);
    }
  }
  return resultado;
}

export function getAll(type) {
  return Object.values(get(type));
}

export function getByMonth(type, month) {
  const records = get(type);
  return Object.values(records).filter((row) => {
    if (!row.date) return false;
    const date = new Date(row.date);
    return date.getMonth() === month;
  });
}

// Todos os registros de um dia, agrupados por type. Uma passada única na tabela
// (a "uma query só" da tela hoje), reusando hidratar. Compara ano/mês/dia local
// de `date` (ISO string), mesma convenção de getByMonth.
/**
 * Agrupa por tipo os registros de um dia, a partir de uma tabela JÁ EM MÃOS.
 *
 * ⚠️ **Existe pra que a tela derive do dado que ela assinou** (#330).
 *
 * O `getByDate` lê a store por fora. Numa tela isso vira um `useMemo` que
 * depende de `records` do `useTable` mas lê o store de novo, e aí o que
 * aparece depende de QUANDO a leitura acontece em relação à assinatura, em vez
 * de ser função pura do dado assinado. O sintoma relatado: editar a duração de
 * um sono de hoje não mudava o valor na Home, e sair da tela e voltar
 * corrigia. Mesma família do #108.
 *
 * @param {Record<string, any>} linhas Tabela `records`, como o `useTable` devolve.
 * @param {string} isoDate
 */
export function groupByDate(linhas, isoDate) {
  const alvo = new Date(isoDate);
  const porTipo = {};
  for (const [id, linha] of Object.entries(linhas)) {
    if (!linha.date) continue;
    const d = new Date(linha.date);
    if (
      d.getFullYear() === alvo.getFullYear() &&
      d.getMonth() === alvo.getMonth() &&
      d.getDate() === alvo.getDate()
    ) {
      if (!porTipo[linha.type]) porTipo[linha.type] = [];
      porTipo[linha.type].push(hidratar(id, linha));
    }
  }
  // Mais recente primeiro (#314). A ordem natural aqui é a de iteração da
  // tabela, que na prática é ordem de inserção, e a tela de histórico mostrava
  // o registro mais velho do dia no topo.
  for (const tipo of Object.keys(porTipo)) {
    porTipo[tipo] = maisRecentesPrimeiro(porTipo[tipo]);
  }
  return porTipo;
}

/** Igual ao `groupByDate`, lendo a store. Pra quem não tem a tabela em mãos. */
export function getByDate(isoDate) {
  return groupByDate(store.getTable(TABLE), isoDate);
}

export function getToday() {
  return getByDate(new Date().toISOString());
}

export function clearAll() {
  // Só os registros: a lista de testers (admin) sobrevive ao "limpar dados".
  store.delTable(TABLE);
}

// --- Display name (Home greeting) ---

export function getDisplayName() {
  return String(store.getValue("displayName") || "");
}

export function setDisplayName(name) {
  store.setValue("displayName", String(name ?? "").trim());
}

// --- Lembrete do hábito em foco (#364) ---

export function setReminderEnabled(on) {
  localStore.setValue("reminderEnabled", Boolean(on));
}

export function setReminderTime(hhmm) {
  localStore.setValue("reminderTime", String(hhmm ?? "").trim());
}

export function setSleepReminderEnabled(on) {
  localStore.setValue("sleepReminderEnabled", Boolean(on));
}

// --- Timer de exercício e estudo (#369) ---

/** Começa o timer de `metric`. Um por vez: quem chama confere antes. */
export function startTimer(metric, now = Date.now()) {
  localStore.transaction(() => {
    localStore.setValue("timerMetric", String(metric));
    localStore.setValue("timerStartedAt", Number(now));
  });
}

/** Desliga o timer, seja ao parar, seja ao descartar. */
export function clearTimer() {
  localStore.transaction(() => {
    localStore.setValue("timerMetric", "");
    localStore.setValue("timerStartedAt", 0);
  });
}

// --- Sync (M6 fatia 3, #202) ---

// UUID-like local: 22 chars alfanuméricos, ~130 bits. Não é criptograficamente
// forte, mas é obscuro o bastante pra ninguém adivinhar o room de outro tester.
// Evita depender de expo-crypto (não instalado) e do crypto.randomUUID (RN não
// garante em todas as versões).
function generateRoomId() {
  const chunk = () => Math.random().toString(36).slice(2, 13);
  return (chunk() + chunk()).slice(0, 22);
}

/**
 * Garante que o store tem um `syncRoomId`. Chamar DEPOIS do startAutoLoad do
 * persister local, senão pode gerar um room, ser sobrescrito pelo load, e o
 * sync tenta se conectar num room que muda no meio do caminho.
 * @returns {string} o roomId (novo ou existente).
 */
export function ensureSyncRoomId() {
  let roomId = store.getValue("syncRoomId");
  if (!roomId) {
    roomId = generateRoomId();
    store.setValue("syncRoomId", roomId);
  }
  return roomId;
}

// --- Metas por métrica (#285) ---

/**
 * Semeia as metas que ainda não existem, com os defaults.
 *
 * Chamada no `then` do persister pelo mesmo motivo do `ensureSyncRoomId`: se
 * semear ANTES do `startAutoLoad` terminar, o load sobrescreve o que acabou
 * de ser escrito. Manter como último passo se alguém mexer na ordem.
 *
 * Não sobrescreve meta existente, porque o usuário poderá editar em fatia futura, e
 * seed não pode desfazer escolha de ninguém.
 */
export function ensureGoals() {
  for (const [metric, target] of Object.entries(DEFAULT_GOALS)) {
    if (store.getCell(GOALS, metric, "target") == null) {
      store.setRow(GOALS, metric, { target, updatedAt: Date.now() });
    }
  }
}

/** Metas como objeto simples `{ metric: target }`, pro `goalFor`. */
export function getGoals() {
  const out = {};
  for (const [metric, row] of Object.entries(store.getTable(GOALS) ?? {})) {
    if (Number.isFinite(row?.target)) out[metric] = row.target;
  }
  return out;
}

/**
 * Eleva o pico de nível, se o atual for maior. Nunca abaixa.
 *
 * Chamar de efeito, nunca durante render, porque é escrita no store.
 */
export function raiseJourneyPeak(level) {
  if (!Number.isFinite(level)) return;
  const atual = Number(store.getValue("journeyPeakLevel")) || 0;
  if (level > atual) store.setValue("journeyPeakLevel", level);
}

/**
 * Concede/revoga estabilidade a um hábito pra PREVISUALIZAR a tela dele.
 *
 * Reusa `journeyGranted`, que é o mesmo caminho da conferência de histórico
 * (#295): a tela de detalhe não sabe (nem precisa saber) se a estabilidade
 * veio de mérito ou de previsualização. Revogar limpa a data junto, senão
 * sobraria um "estável há N dias" de um hábito que não é mais estável.
 */
export function toggleDemoStable(metric) {
  const atuais = getGrantedHabits();
  const tem = atuais.includes(metric);
  const proximos = tem
    ? atuais.filter((m) => m !== metric)
    : [...atuais, metric];
  store.setValue("journeyGranted", proximos.join(","));
  if (tem) {
    const datas = getGraduatedAt();
    delete datas[metric];
    store.setValue(
      "journeyGraduatedAt",
      Object.entries(datas)
        .map(([m, ms]) => `${m}:${ms}`)
        .join(","),
    );
  }
}

/**
 * Liga/desliga a previsualização de nível. `-1` desliga.
 *
 * Ao sair do demo, devolve peak e ack ao nível real pra não deixar resíduo —
 * sem isso o app mostraria um aviso de regressão que nunca aconteceu.
 */
/**
 * Liga e desliga a previsualização da retomada (#320).
 *
 * @returns {boolean} o estado novo.
 */
export function toggleRetomadaDemo() {
  const novo = !localStore.getValue("retomadaDemo");
  localStore.setValue("retomadaDemo", novo);
  return novo;
}

export function setJourneyDemoLevel(level, realLevel) {
  const alvo = Number.isFinite(level) ? level : -1;
  localStore.setValue("journeyDemoLevel", alvo);
  if (alvo < 0 && Number.isFinite(realLevel)) {
    store.setValue("journeyPeakLevel", realLevel);
    store.setValue("journeyAckLevel", realLevel);
  }
}

/** Hábitos graduados por conferência, como lista. */
export function getGrantedHabits() {
  return String(store.getValue("journeyGranted") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Concede graduação a um hábito. Idempotente. */
export function grantHabit(metric) {
  if (!metric) return;
  const atuais = getGrantedHabits();
  if (atuais.includes(metric)) return;
  store.setValue("journeyGranted", [...atuais, metric].join(","));
}

/** Datas de graduação como `{ metric: epochMs }`. */
export function getGraduatedAt() {
  const out = {};
  for (const par of String(store.getValue("journeyGraduatedAt") ?? "").split(
    ",",
  )) {
    const [metric, ms] = par.split(":");
    const n = Number(ms);
    if (metric && Number.isFinite(n) && n > 0) out[metric.trim()] = n;
  }
  return out;
}

/**
 * Sincroniza as datas com quem está estável agora.
 *
 * Marca a data na PRIMEIRA vez que o hábito aparece estável, e apaga quando
 * ele deixa de estar, e assim reconquistar recomeça a contagem, em vez de
 * herdar um "estável há 90 dias" que não é verdade.
 *
 * Chamar de efeito, nunca em render.
 */
export function syncGraduatedAt(estaveis, agora = Date.now()) {
  const atuais = getGraduatedAt();
  const proximos = {};
  for (const metric of estaveis ?? []) {
    proximos[metric] = atuais[metric] ?? agora;
  }
  const serializado = Object.entries(proximos)
    .map(([m, ms]) => `${m}:${ms}`)
    .join(",");
  if (serializado !== String(store.getValue("journeyGraduatedAt") ?? "")) {
    store.setValue("journeyGraduatedAt", serializado);
  }
}

/** Marca o nível como visto. Chamar ao dispensar um momento. */
export function acknowledgeJourneyLevel(level) {
  if (!Number.isFinite(level)) return;
  store.setValue("journeyAckLevel", level);
}

// --- Higiene do sono (#396) ---

/** O horário-alvo de deitar, "HH:MM", ou vazio. */
export function getHygieneTarget() {
  return String(store.getValue("hygieneTarget") ?? "");
}

/** A escada como a jornada recebe: `{alvo, degraus}`. */
export function getHygiene() {
  return {
    alvo: getHygieneTarget(),
    degraus: degrausDaTabela(store.getTable(HYGIENE_STEPS)),
  };
}

export function setHygieneTarget(hhmm) {
  store.setValue("hygieneTarget", hhmm ?? "");
}

/**
 * Começa uma regra da escada. Quem confere se pode (uma por vez, regra ainda
 * não iniciada) é o `podeComecar`; aqui só não se reescreve degrau existente.
 */
export function startHygieneRule(regra, now = Date.now()) {
  if (store.hasRow(HYGIENE_STEPS, regra)) return;
  store.setRow(HYGIENE_STEPS, regra, { startedAt: now });
}

/** Marca a regra como conquistada. Idempotente: a primeira data fica. */
export function conquerHygieneRule(regra, now = Date.now()) {
  if (!store.hasRow(HYGIENE_STEPS, regra)) return;
  if (store.getCell(HYGIENE_STEPS, regra, "conqueredAt") > 0) return;
  store.setCell(HYGIENE_STEPS, regra, "conqueredAt", now);
}

/**
 * Desiste da regra ativa, pra escolher outra. Só regra ainda não formada:
 * conquista não se perde. Os rituais já marcados ficam no histórico, e voltam
 * a contar se a pessoa escolher a mesma regra de novo.
 */
export function dropHygieneRule(regra) {
  if (!store.hasRow(HYGIENE_STEPS, regra)) return;
  if (store.getCell(HYGIENE_STEPS, regra, "conqueredAt") > 0) return;
  store.delRow(HYGIENE_STEPS, regra);
}

// --- Testers (tela de admin, Track A do M3-5) ---

// Normaliza o número pra algo próximo de E.164: mantém dígitos e um "+" inicial.
function normalizePhone(phone) {
  const raw = String(phone ?? "").trim();
  const plus = raw.startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

export function getTesters() {
  const linhas = store.getTable(TESTERS);
  return Object.entries(linhas)
    .map(([id, linha]) => ({ id, ...linha }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export function addTester({ name, phone }) {
  return store.addRow(TESTERS, {
    name: String(name ?? "").trim(),
    phone: normalizePhone(phone),
    createdAt: Date.now(),
  });
}

export function removeTester(id) {
  store.delRow(TESTERS, id);
}

// --- Pacotes de chave da criptografia ponta a ponta (#388) ---

/** Grava um pacote NOVO. Usa o `kid` como id da linha, então nunca colide. */
export function addKeyBundle(bundle) {
  store.setRow(E2E_KEYS, bundle.kid, {
    bundle: JSON.stringify(bundle),
    createdAt: Date.now(),
  });
}

/**
 * Regrava um pacote existente (troca de senha ou recuperação). Mantém o
 * `createdAt`: é ele que decide qual pacote é o principal.
 */
export function updateKeyBundle(bundle) {
  store.setCell(E2E_KEYS, bundle.kid, "bundle", JSON.stringify(bundle));
}
