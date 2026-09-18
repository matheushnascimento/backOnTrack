// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// Smoke test do server WS (M6 #198).
//
// Conecta como cliente TinyBase, escreve uma célula, desconecta, reconecta e
// confirma que o valor voltou. Prova o round-trip pelo transporte.
//
//   URL=ws://localhost:8787 npm run smoke
//   URL=wss://<sub>.<seu-dominio> TOKEN=<jwt> npm run smoke
//
// Em vez de teste unitário, é um "ping" que dá pra rodar contra dev local ou
// contra o server em produção. Sai 0 se OK, 1 se falhou.
//
// ## TOKEN é obrigatório contra produção
//
// Desde o flip pra `AUTH_MODE=required` (04/09), conexão sem token leva 401.
// O token sai da sessão do Supabase de um usuário logado (DevTools do app web,
// `localStorage`, campo `access_token`), e vale cerca de 1 hora.
//
// A sala vem do `sub` do token, porque o server recusa com 403 quando a sala
// pedida não é a do dono. Ou seja: **isto escreve na sala real da conta**.
// Por isso a rodada apaga a tabela `ping` no fim, pra não deixar lixo
// sincronizando pro aparelho da pessoa.

import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";
import { diagnose, resolveTarget } from "./smoke-target.js";

const URL = process.env.URL ?? "ws://localhost:8787";
const TOKEN = process.env.TOKEN ?? "";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 5000);

function log(...args) {
  console.log("[smoke]", ...args);
}
function fail(msg) {
  console.error("[smoke] ✖", msg);
  process.exit(1);
}

let alvo;
try {
  alvo = resolveTarget({ url: URL, room: process.env.ROOM, token: TOKEN });
} catch (e) {
  fail(e.message);
}

// O token não vai pro log: é credencial de sessão viva.
log(
  `alvo: ${URL} sala=${alvo.room} ${alvo.authed ? "(com token)" : "(anônimo)"}`,
);

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout: ${label}`)), ms),
    ),
  ]);
}

async function connectAndSync(store) {
  const sync = await createWsSynchronizer(store, new WebSocket(alvo.wsUrl));
  await sync.startSync();
  return sync;
}

/** Explica a recusa em vez de deixar "got undefined" solto. */
async function explicarFalha(detalhe) {
  const causa = await diagnose({ baseUrl: URL, authed: alvo.authed });
  fail(`${detalhe}\n           ${causa}`);
}

// Round 1: escrever um valor único e desconectar.
const now = String(Date.now());
log("conectando (round 1)");
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
log(`escreveu ${now} e desconectou`);

// Round 2: reconectar com store limpa e conferir que o valor voltou do server.
log("reconectando (round 2)");
const store2 = createMergeableStore();
const sync2 = await withTimeout(
  connectAndSync(store2),
  TIMEOUT_MS,
  "connect#2",
);
await new Promise((r) => setTimeout(r, 500));
const got = store2.getCell("ping", "row1", "value");

if (got !== now) {
  await sync2.destroy();
  await explicarFalha(`esperava ${now}, veio ${JSON.stringify(got)}`);
}

// Limpa o rastro. Sem isto, a sala real da conta fica com uma tabela `ping`
// que o CRDT sincroniza pro aparelho, e o app nunca a remove porque não a
// conhece.
store2.delTable("ping");
await new Promise((r) => setTimeout(r, 500));
await sync2.destroy();

log(`✓ round trip OK (${got}), tabela ping removida`);
process.exit(0);
