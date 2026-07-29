// Igual ao smoke-client, mas com wait maior entre write e destroy,
// pra testar se o problema é o cliente fechar antes do server processar.
import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";

const URL = process.env.URL ?? "wss://backontrack-sync.mhdn.com.br";
const ROOM = "smoke-debug-" + Date.now(); // sala nova, pra descartar cache
const wait = Number(process.env.WAIT_MS ?? 3000);
const wsUrl = `${URL.replace(/\/+$/, "")}/${ROOM}`;

console.log(`[debug] wait=${wait}ms | url=${wsUrl}`);

// R1: escrever
const s1 = createMergeableStore();
const sync1 = await createWsSynchronizer(s1, new WebSocket(wsUrl));
await sync1.startSync();
const now = String(Date.now());
s1.setCell("ping", "row1", "value", now);
console.log(`[debug] wrote ${now}, waiting ${wait}ms before destroy...`);
await new Promise(r => setTimeout(r, wait));
await sync1.destroy();

// R2: reconectar
console.log("[debug] reconnecting...");
const s2 = createMergeableStore();
const sync2 = await createWsSynchronizer(s2, new WebSocket(wsUrl));
await sync2.startSync();
await new Promise(r => setTimeout(r, wait));
const got = s2.getCell("ping", "row1", "value");
await sync2.destroy();

if (got === now) {
  console.log(`[debug] ✓ round-trip OK (${got})`);
  process.exit(0);
} else {
  console.log(`[debug] ✖ expected ${now}, got ${JSON.stringify(got)}`);
  process.exit(1);
}
