import { createStore } from "tinybase";

const TABLE = "records";

export const store = createStore().setTablesSchema({
  [TABLE]: {
    type: { type: "string" },
    date: { type: "string" },
    details: { type: "string", default: "{}" },
    createdAt: { type: "number" },
  },
});

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

export function add(type, data) {
  const { date, ...details } = data;
  store.addRow(TABLE, {
    type,
    date: date ?? "",
    details: JSON.stringify(details ?? {}),
    createdAt: Date.now(),
  });
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

export function getByMonth(type, month) {
  const records = get(type);
  return Object.values(records).filter((row) => {
    if (!row.date) return false;
    const date = new Date(row.date);
    return date.getMonth() === month;
  });
}
