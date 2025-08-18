import { createStore } from "tinybase";

const store = createStore();

function get(tableName) {
  const data = store.getTable(tableName);
  // eslint-disable-next-line no-undef
  console.log(data);
}

function add(tableName, data) {
  const id = Math.random().toString(30).substring(2, 20);
  store.setRow(tableName, id, data);
  get(tableName);
}
export { get, add };
