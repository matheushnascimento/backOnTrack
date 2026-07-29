// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes do server WS de sync (M6, fatia 2, #198). Sobe o server em subprocess
// com porta aleatória + tmpdir isolado — testa o CÓDIGO do server (não a infra
// do túnel Cloudflare, que é outra classe de coisa). Roda in-process no CI,
// sem depender de rede externa nem gerar lixo no server público.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { WebSocket } from "ws";

const SERVER_JS = resolve(__dirname, "..", "server", "server.js");

// Porta alta aleatória — evita colisão com serviços conhecidos. 1-em-milhares
// de chance de conflito com outro processo local; se acontecer, re-roda.
const PORT = 40000 + Math.floor(Math.random() * 10000);

let child;
let dataDir;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "sync-server-test-"));

  child = spawn("node", [SERVER_JS], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Espera o log "listening on ..." — indica que o WebSocketServer já bindou.
  await new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(
      () => rejectReady(new Error("server didn't come up in 5s")),
      5000,
    );
    child.stdout.on("data", (buf) => {
      if (String(buf).includes("[sync] listening on ws://")) {
        clearTimeout(timer);
        resolveReady();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      rejectReady(new Error(`server exited early with code ${code}`));
    });
  });
}, 10000);

afterAll(async () => {
  if (child && !child.killed) {
    child.kill("SIGTERM");
    // Fallback SIGKILL se não morrer em 2s.
    await new Promise((r) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        r();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(t);
        r();
      });
    });
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

/** Conecta como cliente TinyBase, retorna [store, sync]. */
async function connect(room) {
  const store = createMergeableStore();
  const url = `ws://localhost:${PORT}/${room}`;
  const sync = await createWsSynchronizer(store, new WebSocket(url));
  await sync.startSync();
  return [store, sync];
}

test("round-trip: valor escrito volta em nova conexão (fatia 2 do M6)", async () => {
  const now = String(Date.now());

  // Round 1: escreve e desconecta.
  const [s1, sync1] = await connect("round-trip");
  s1.setCell("ping", "row1", "value", now);
  await new Promise((r) => setTimeout(r, 300));
  await sync1.destroy();

  // Round 2: reconecta com store limpa — valor deve voltar do server.
  const [s2, sync2] = await connect("round-trip");
  await new Promise((r) => setTimeout(r, 300));
  const got = s2.getCell("ping", "row1", "value");
  await sync2.destroy();

  expect(got).toBe(now);
});

test("persistência: arquivo JSON por sala é criado no DATA_DIR", async () => {
  const [store, sync] = await connect("persist-check");
  store.setCell("t", "r", "c", "v");
  await new Promise((r) => setTimeout(r, 300));
  await sync.destroy();

  // O safeFilename do server transforma o pathId em `<nome>.json`.
  const files = readdirSync(dataDir);
  expect(files).toContain("persist-check.json");
});

test("path traversal: pathId malicioso não escapa do DATA_DIR", async () => {
  // safeFilename troca qualquer coisa fora de [A-Za-z0-9_-] por hífen. Se
  // alguém tentar `../../etc/passwd`, deve virar algo tipo `etc-passwd.json`
  // dentro do DATA_DIR — não escrever fora.
  const [store, sync] = await connect("..%2F..%2Fetc%2Fpasswd");
  store.setCell("x", "y", "z", "1");
  await new Promise((r) => setTimeout(r, 300));
  await sync.destroy();

  const files = readdirSync(dataDir);
  // Todos os arquivos gerados devem estar diretamente no dataDir e ser .json —
  // nenhum ../../ escapou.
  for (const f of files) {
    expect(f).toMatch(/^[A-Za-z0-9_.-]+\.json$/);
    expect(f).not.toContain("/");
  }
});
