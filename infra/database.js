// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { createMergeableStore } from "tinybase";

import { DEFAULT_GOALS } from "@/constants/goals";

const TABLE = "records";
const TESTERS = "testers";
const GOALS = "goals";

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
    // Ajustes — não existiam como dado, e o portão de nível não fecha sem
    // elas. Ver docs/11-modelo-de-niveis.md §10.
    [GOALS]: {
      target: { type: "number" },
      updatedAt: { type: "number" },
    },
  })
  .setValuesSchema({
    // Room ID por install pra sync WS (M6 fatia 3, #202). Gerado no 1º launch
    // (ver infra/persistence.js). Default vazio = sync ainda não inicializado.
    syncRoomId: { type: "string", default: "" },
    // Como o usuário quer ser chamado no cumprimento da Home. Preferido em
    // relação à derivação do email — que quando presente cai no primeiro nome
    // (antes do primeiro ponto). Editável em Ajustes.
    displayName: { type: "string", default: "" },
    // Maior nível já alcançado na jornada (#289). É a MEMÓRIA que torna
    // regressão detectável: o nível atual é derivado dos sinais, e olhando só
    // o presente não dá pra distinguir "caiu do lvl 3" de "nunca passou do 2".
    // Só sobe — cair é justamente o que se quer poder detectar.
    journeyPeakLevel: { type: "number", default: 0 },
  });

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
// de `date` (ISO string) — mesma convenção de getByMonth.
export function getByDate(isoDate) {
  const alvo = new Date(isoDate);
  const linhas = store.getTable(TABLE);
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
  return porTipo;
}

export function getToday() {
  return getByDate(new Date().toISOString());
}

export function clearAll() {
  // Só os registros — a lista de testers (admin) sobrevive ao "limpar dados".
  store.delTable(TABLE);
}

// --- Display name (Home greeting) ---

export function getDisplayName() {
  return String(store.getValue("displayName") || "");
}

export function setDisplayName(name) {
  store.setValue("displayName", String(name ?? "").trim());
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
 * persister local — senão pode gerar um room, ser sobrescrito pelo load, e o
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
 * Não sobrescreve meta existente — o usuário poderá editar em fatia futura, e
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
 * Chamar de efeito, nunca durante render — é escrita no store.
 */
export function raiseJourneyPeak(level) {
  if (!Number.isFinite(level)) return;
  const atual = Number(store.getValue("journeyPeakLevel")) || 0;
  if (level > atual) store.setValue("journeyPeakLevel", level);
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
