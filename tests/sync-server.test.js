// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes do server WS de sync (M6, fatia 2, #198). Sobe o server em subprocess
// com porta do SO + tmpdir isolado: testa o CÓDIGO do server (não a infra
// do túnel Cloudflare, que é outra classe de coisa). Roda in-process no CI,
// sem depender de rede externa nem gerar lixo no server público.

import { readdirSync } from "node:fs";
import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";

import { startSyncServer, stopSyncServer } from "./support/syncServer";

let servidor;
let dataDir;
let port;

beforeAll(async () => {
  servidor = await startSyncServer();
  ({ dataDir, port } = servidor);
}, 15000);

afterAll(async () => {
  if (servidor) await stopSyncServer(servidor);
});

/** Conecta como cliente TinyBase, retorna [store, sync]. */
async function connect(room) {
  const store = createMergeableStore();
  const url = `ws://localhost:${port}/${room}`;
  const sync = await createWsSynchronizer(store, new WebSocket(url));
  await sync.startSync();
  return [store, sync];
}

test("round-trip: valor escrito volta em nova conexão (fatia 2 do M6)", async () => {
  const now = String(Date.now());

  // Round 1: escreve e desconecta.
  const [s1, sync1] = await connect("round-trip");
  s1.setCell("ping", "row1", "value", now);
  await new Promise((r) => setTimeout(r, 1500));
  await sync1.destroy();

  // Round 2: reconecta com store limpa: valor deve voltar do server.
  const [s2, sync2] = await connect("round-trip");
  await new Promise((r) => setTimeout(r, 1500));
  const got = s2.getCell("ping", "row1", "value");
  await sync2.destroy();

  expect(got).toBe(now);
  // 15s: 2 conexões + 2 waits de 1500ms + margem pra CI lento (default é 5s).
}, 15_000);

test("persistência: arquivo JSON por sala é criado no DATA_DIR", async () => {
  const [store, sync] = await connect("persist-check");
  store.setCell("t", "r", "c", "v");
  await new Promise((r) => setTimeout(r, 1500));
  await sync.destroy();

  // O safeFilename do server transforma o pathId em `<nome>.json`.
  const files = readdirSync(dataDir);
  expect(files).toContain("persist-check.json");
});

test("path traversal: pathId malicioso não escapa do DATA_DIR", async () => {
  // safeFilename troca qualquer coisa fora de [A-Za-z0-9_-] por hífen. Se
  // alguém tentar `../../etc/passwd`, deve virar algo tipo `etc-passwd.json`
  // dentro do DATA_DIR, sem escrever fora.
  const [store, sync] = await connect("..%2F..%2Fetc%2Fpasswd");
  store.setCell("x", "y", "z", "1");
  await new Promise((r) => setTimeout(r, 1500));
  await sync.destroy();

  const files = readdirSync(dataDir);
  // Guarda contra falso-positivo: se o server nem chegou a persistir, o
  // for-loop passa vacuamente. Exige pelo menos 1 arquivo.
  expect(files.length).toBeGreaterThan(0);
  // Todos os arquivos gerados devem estar diretamente no dataDir e ser .json —
  // nenhum ../../ escapou.
  for (const f of files) {
    expect(f).toMatch(/^[A-Za-z0-9_.-]+\.json$/);
    expect(f).not.toContain("/");
  }
});
