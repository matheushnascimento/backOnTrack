import { createStore } from "tinybase";

const TABELA = "registros";

export const store = createStore().setTablesSchema({
  [TABELA]: {
    tipo: { type: "string" },
    date: { type: "string" },
    detalhes: { type: "string", default: "{}" },
    criadoEm: { type: "number" },
  },
});

function hidratar(id, linha) {
  const { detalhes, ...resto } = linha;
  let extras;
  try {
    extras = JSON.parse(detalhes || "{}");
  } catch {
    extras = {};
  }
  return { id, ...resto, ...extras };
}

export function add(tipo, data) {
  const { date, ...detalhes } = data;
  store.addRow(TABELA, {
    tipo,
    date: date ?? "",
    detalhes: JSON.stringify(detalhes ?? {}),
    criadoEm: Date.now(),
  });
}

export function get(tipo) {
  const linhas = store.getTable(TABELA);
  const resultado = {};
  for (const [id, linha] of Object.entries(linhas)) {
    if (linha.tipo === tipo) {
      resultado[id] = hidratar(id, linha);
    }
  }
  return resultado;
}

export function getByMonth(tipo, month) {
  const registros = get(tipo);
  return Object.values(registros).filter((row) => {
    if (!row.date) return false;
    const date = new Date(row.date);
    return date.getMonth() === month;
  });
}
