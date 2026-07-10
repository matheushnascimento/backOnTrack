// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { createStore } from "tinybase";

const TABLE = "records";

export const store = createStore().setTablesSchema({
  [TABLE]: {
    type: { type: "string" },
    date: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
    note: { type: "string" },
    details: { type: "string", default: "{}" },
    createdAt: { type: "number" },
  },
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

export function clearAll() {
  store.delTables();
}
