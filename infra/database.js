import { createStore } from "tinybase";

const store = createStore();

function get(tableName) {
  const data = store.getTable(tableName);
  if (Object.keys(data).length !== 0) return data;
}

function add(tableName, data) {
  const id = Math.random().toString(30).substring(2, 20);
  store.setRow(tableName, id, data);
}
export { get, add };
