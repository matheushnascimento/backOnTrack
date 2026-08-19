// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// Smoke test do server WS (M6 #198).
//
// Conecta como cliente TinyBase, escreve uma célula, desconecta, reconecta e
// confirma que o valor voltou. Prova o round-trip pelo transporte.
//
//   URL=ws://localhost:8787 node smoke-client.js
//   URL=wss://<sub>.<seu-dominio> node smoke-client.js
//
// Em vez de teste unitário, é um "ping" que dá pra rodar contra dev local ou
// contra o server em produção. Sai 0 se OK, 1 se falhou.

import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";

const URL = process.env.URL ?? "ws://localhost:8787";
const ROOM = process.env.ROOM ?? "smoke-test";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 5000);

const wsUrl = `${URL.replace(/\/+$/, "")}/${ROOM}`;

function log(...args) {
  console.log("[smoke]", ...args);
}
function fail(msg) {
  console.error("[smoke] ✖", msg);
  process.exit(1);
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout: ${label}`)), ms),
    ),
  ]);
}

async function connectAndSync(store) {
  const sync = await createWsSynchronizer(store, new WebSocket(wsUrl));
  await sync.startSync();
  return sync;
}

// Round 1: escrever um valor único e desconectar.
const now = String(Date.now());
log(`connecting to ${wsUrl} (round 1)`);
const store1 = createMergeableStore();
const sync1 = await withTimeout(
  connectAndSync(store1),
  TIMEOUT_MS,
  "connect#1",
);
store1.setCell("ping", "row1", "value", now);
// pequeno intervalo pra o synchronizer empurrar
await new Promise((r) => setTimeout(r, 500));
await sync1.destroy();
log(`wrote value ${now} and disconnected`);

// Round 2: reconectar com store limpa e conferir que o valor voltou do server.
log("reconnecting (round 2)");
const store2 = createMergeableStore();
const sync2 = await withTimeout(
  connectAndSync(store2),
  TIMEOUT_MS,
  "connect#2",
);
await new Promise((r) => setTimeout(r, 500));
const got = store2.getCell("ping", "row1", "value");
await sync2.destroy();

if (got !== now) {
  fail(`expected ${now}, got ${JSON.stringify(got)}`);
}
log(`✓ round trip OK (${got})`);
process.exit(0);
