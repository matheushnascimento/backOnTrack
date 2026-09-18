// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// Smoke test de sync entre 2 clients (M6 fatia 3, #202).
//
// Diferente do smoke-client.js (self round-trip: escreve → desconecta →
// reconecta → lê próprio valor), aqui abrimos 2 clients SIMULTANEAMENTE no
// mesmo room e provamos que um vê a escrita do outro via server. É o teste
// que responde "sync funciona entre dois devices?", sem depender do app RN.
//
//   ROOM=<uuid-de-testes> URL=ws://localhost:8787 npm run smoke:multi
//   URL=wss://backontrack-sync.mhdn.com.br TOKEN=<jwt> npm run smoke:multi
//
// Sai 0 se A→B e B→A propagaram; 1 se qualquer direção falhou.
//
// ## Contra produção, TOKEN é obrigatório
//
// Desde o flip pra `AUTH_MODE=required` (04/09), conexão sem token leva 401.
// Com token, a sala vem do `sub` e os dois clients entram na sala REAL da
// conta, porque o server recusa qualquer outra com 403. Os dois são a mesma
// identidade em conexões separadas, o que ainda prova a propagação.
//
// Por escrever em sala real, a rodada apaga a tabela `sync-test` no fim.
//
// Anônimo (dev local com AUTH_MODE=optional), sempre passar ROOM único: nunca
// o roomId de um tester real.

import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";
import { diagnose, resolveTarget } from "./smoke-target.js";

const URL = process.env.URL ?? "ws://localhost:8787";
const TOKEN = process.env.TOKEN ?? "";
const PROPAGATION_MS = Number(process.env.PROPAGATION_MS ?? 2000);

function log(who, ...args) {
  console.log(`[smoke-multi ${who}]`, ...args);
}
function fail(msg) {
  console.error("[smoke-multi] ✖", msg);
  process.exit(1);
}

let alvo;
try {
  alvo = resolveTarget({
    url: URL,
    room: process.env.ROOM,
    token: TOKEN,
    fallbackRoom: `smoke-multi-${Date.now()}`,
  });
} catch (e) {
  fail(e.message);
}

async function connect(label) {
  const store = createMergeableStore();
  const sync = await createWsSynchronizer(store, new WebSocket(alvo.wsUrl));
  await sync.startSync();
  log(label, "conectado");
  return [store, sync];
}

/** Explica a recusa em vez de deixar a falha de propagação solta. */
async function explicarFalha(detalhe) {
  const causa = await diagnose({ baseUrl: URL, authed: alvo.authed });
  fail(`${detalhe}\n                    ${causa}`);
}

// O token não vai pro log: é credencial de sessão viva.
log("root", `URL=${URL}`);
log("root", `sala=${alvo.room} ${alvo.authed ? "(com token)" : "(anônimo)"}`);

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
  await explicarFalha(
    `A→B falhou: B esperava ${fromA}, recebeu ${JSON.stringify(seenByB)}`,
  );
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
  await explicarFalha(
    `B→A falhou: A esperava ${fromB}, recebeu ${JSON.stringify(seenByA)}`,
  );
}

// Limpa o rastro: em sala real, esta tabela sincronizaria pro aparelho da
// pessoa e o app nunca a removeria, porque não a conhece.
aStore.delTable("sync-test");
await new Promise((r) => setTimeout(r, PROPAGATION_MS));

await aSync.destroy();
await bSync.destroy();
log("root", "✓ A↔B sync OK, tabela sync-test removida");
process.exit(0);
