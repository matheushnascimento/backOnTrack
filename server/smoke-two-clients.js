// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// Smoke test de sync entre 2 clients (M6 fatia 3, #202).
//
// Diferente do smoke-client.js (self round-trip: escreve → desconecta →
// reconecta → lê próprio valor), aqui abrimos 2 clients SIMULTANEAMENTE no
// mesmo room e provamos que um vê a escrita do outro via server. É o teste
// que responde "sync funciona entre dois devices?", sem depender do app RN.
//
//   ROOM=<uuid-de-testes> URL=wss://backontrack-sync.mhdn.com.br node smoke-two-clients.js
//
// Sai 0 se A→B e B→A propagaram; 1 se qualquer direção falhou.
// SEMPRE passar ROOM único (não usar o roomId de nenhum tester real!).

import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";

const URL = process.env.URL ?? "ws://localhost:8787";
const ROOM = process.env.ROOM ?? `smoke-multi-${Date.now()}`;
const PROPAGATION_MS = Number(process.env.PROPAGATION_MS ?? 2000);

const wsUrl = `${URL.replace(/\/+$/, "")}/${ROOM}`;

function log(who, ...args) {
  console.log(`[smoke-multi ${who}]`, ...args);
}
function fail(msg) {
  console.error("[smoke-multi] ✖", msg);
  process.exit(1);
}

async function connect(label) {
  const store = createMergeableStore();
  const sync = await createWsSynchronizer(store, new WebSocket(wsUrl));
  await sync.startSync();
  log(label, "connected");
  return [store, sync];
}

log("root", `URL=${wsUrl}`);
log("root", `ROOM=${ROOM}`);

// Abrir A e B ao mesmo tempo, no mesmo room.
const [[aStore, aSync], [bStore, bSync]] = await Promise.all([
  connect("A"),
  connect("B"),
]);

// Deixar A e B trocarem estado inicial antes de qualquer escrita.
await new Promise((r) => setTimeout(r, PROPAGATION_MS));

// A escreve; B deve ver.
const fromA = `A@${Date.now()}`;
aStore.setCell("sync-test", "row-A", "value", fromA);
log("A", `wrote ${fromA}`);
await new Promise((r) => setTimeout(r, PROPAGATION_MS));
const seenByB = bStore.getCell("sync-test", "row-A", "value");
log("B", `sees row-A = ${JSON.stringify(seenByB)}`);
if (seenByB !== fromA) {
  await aSync.destroy();
  await bSync.destroy();
  fail(`A→B falhou: B esperava ${fromA}, recebeu ${JSON.stringify(seenByB)}`);
}

// B escreve; A deve ver. Prova bidirecionalidade.
const fromB = `B@${Date.now()}`;
bStore.setCell("sync-test", "row-B", "value", fromB);
log("B", `wrote ${fromB}`);
await new Promise((r) => setTimeout(r, PROPAGATION_MS));
const seenByA = aStore.getCell("sync-test", "row-B", "value");
log("A", `sees row-B = ${JSON.stringify(seenByA)}`);
if (seenByA !== fromB) {
  await aSync.destroy();
  await bSync.destroy();
  fail(`B→A falhou: A esperava ${fromB}, recebeu ${JSON.stringify(seenByA)}`);
}

await aSync.destroy();
await bSync.destroy();
log("root", "✓ A↔B sync OK");
process.exit(0);
