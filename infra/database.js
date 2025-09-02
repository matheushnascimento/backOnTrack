import { createStore } from "tinybase";

const store = createStore();

function add(tableName, data) {
  const id = Math.random().toString(30).substring(2, 20);
  store.setRow(tableName, id, data);
}

function get(tableName) {
  const data = store.getTable(tableName);
  if (Object.keys(data).length !== 0) return data;
}
function getByMonth(tableName, month) {
  const data = get(tableName) ?? {};
  return Object.values(data).filter((row) => {
    const date = new Date(row.date);
    return date.getMonth() === month;
  });
}

export { add, get, getByMonth };
