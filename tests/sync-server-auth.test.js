// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes de auth do server WS (M6 fatia B, #211, ADR-010).
// Sobe o server em subprocess com AUTH_MODE / SUPABASE_JWT_SECRET distintos
// por describe, e checa quais conexões o server aceita/rejeita durante o
// handshake HTTP → WebSocket. Testa o CÓDIGO da auth, sem depender de rede.

import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { WebSocket } from "ws";

const SERVER_JS = resolve(__dirname, "..", "server", "server.js");
const JWT_SECRET = "test-jwt-secret-do-not-use-in-prod-please";

// --- Helpers pra construir JWT HS256 sem dep extra ------------------------

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlSig(buf) {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload, { secret = JWT_SECRET, alg = "HS256" } = {}) {
  const header = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = b64urlSig(
    createHmac("sha256", secret).update(signingInput).digest(),
  );
  return `${signingInput}.${sig}`;
}

function futureExp(seconds = 3600) {
  return Math.floor(Date.now() / 1000) + seconds;
}
function pastExp(seconds = 60) {
  return Math.floor(Date.now() / 1000) - seconds;
}

// --- Server subprocess helpers -------------------------------------------

async function startServer(extraEnv = {}) {
  const port = 41000 + Math.floor(Math.random() * 20000);
  const dataDir = mkdtempSync(join(tmpdir(), "sync-auth-test-"));
  const child = spawn("node", [SERVER_JS], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolveReady, rejectReady) => {
    const t = setTimeout(
      () => rejectReady(new Error("server didn't come up in 5s")),
      5000,
    );
    child.stdout.on("data", (buf) => {
      if (String(buf).includes("[sync] listening on ws://")) {
        clearTimeout(t);
        resolveReady();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(t);
      rejectReady(new Error(`server exited early with code ${code}`));
    });
  });

  return { port, dataDir, child };
}

async function stopServer({ child, dataDir }) {
  if (child && !child.killed) {
    child.kill("SIGTERM");
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
}

/**
 * Tenta abrir a conexão WS. Resolve com:
 *   { open: true }               → handshake aceito
 *   { open: false, code: <n> }   → server rejeitou (unexpected-response)
 * Não faz TinyBase sync — só checa o handshake, que é onde a auth vive.
 */
function tryConnect(port, room, token, timeoutMs = 3000) {
  return new Promise((resolveResult) => {
    const url = `ws://localhost:${port}/${room}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolveResult({ open: false, code: "timeout" });
    }, timeoutMs);

    ws.once("open", () => {
      clearTimeout(timer);
      ws.close();
      resolveResult({ open: true });
    });
    ws.once("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      ws.close();
      resolveResult({ open: false, code: res.statusCode });
    });
    ws.once("error", () => {
      // Silenciar — o close/unexpected-response já resolve o resultado.
    });
    ws.once("close", (code) => {
      clearTimeout(timer);
      // Se resolve não foi chamado ainda (rejeição direta sem
      // unexpected-response), reporta o close code.
      resolveResult({ open: false, code });
    });
  });
}

// --- AUTH_MODE=optional --------------------------------------------------

describe("AUTH_MODE=optional (default)", () => {
  let server;
  beforeAll(async () => {
    server = await startServer({
      AUTH_MODE: "optional",
      SUPABASE_JWT_SECRET: JWT_SECRET,
    });
  }, 10000);
  afterAll(async () => stopServer(server));

  test("sem token: aceita anônimo (compat com clientes atuais)", async () => {
    const res = await tryConnect(server.port, "anon-room-1", null);
    expect(res).toEqual({ open: true });
  });

  test("JWT válido + sub === pathId: aceita", async () => {
    const token = signJwt({ sub: "alice", exp: futureExp() });
    const res = await tryConnect(server.port, "alice", token);
    expect(res).toEqual({ open: true });
  });

  test("JWT válido + sub !== pathId: rejeita com 403", async () => {
    const token = signJwt({ sub: "alice", exp: futureExp() });
    const res = await tryConnect(server.port, "bob", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(403);
  });

  test("JWT com assinatura inválida: rejeita com 401", async () => {
    const token = signJwt(
      { sub: "alice", exp: futureExp() },
      { secret: "wrong-secret" },
    );
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });

  test("JWT expirado: rejeita com 401", async () => {
    const token = signJwt({ sub: "alice", exp: pastExp() });
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });

  test("JWT sem sub: rejeita com 401", async () => {
    const token = signJwt({ exp: futureExp() });
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });
});

// --- AUTH_MODE=required --------------------------------------------------

describe("AUTH_MODE=required (fase final, após migração)", () => {
  let server;
  beforeAll(async () => {
    server = await startServer({
      AUTH_MODE: "required",
      SUPABASE_JWT_SECRET: JWT_SECRET,
    });
  }, 10000);
  afterAll(async () => stopServer(server));

  test("sem token: rejeita com 401 (anônimo bloqueado)", async () => {
    const res = await tryConnect(server.port, "anon-room-2", null);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });

  test("JWT válido + sub === pathId: aceita", async () => {
    const token = signJwt({ sub: "alice", exp: futureExp() });
    const res = await tryConnect(server.port, "alice", token);
    expect(res).toEqual({ open: true });
  });
});
