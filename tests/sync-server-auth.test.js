// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes de auth do server WS (M6 fatia B, #211, ADR-010).
// Sobe o server em subprocess com AUTH_MODE / SUPABASE_JWT_SECRET distintos
// por describe, e checa quais conexões o server aceita/rejeita durante o
// handshake HTTP → WebSocket. Testa o CÓDIGO da auth, sem depender de rede.

import { spawn } from "node:child_process";
import {
  createHmac,
  generateKeyPairSync,
  randomUUID,
  sign as cryptoSign,
} from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
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

// --- Helpers ES256 (o que o Supabase usa hoje) ----------------------------

/** Gera par ECC P-256 + o JWK público com um kid. */
function makeEs256Key(kid = randomUUID()) {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid, alg: "ES256" };
  return { kid, jwk, privateKey };
}

/** Assina um JWT ES256. Assinatura é R||S cru (ieee-p1363), como manda o JWS. */
function signEs256({ payload, kid, privateKey }) {
  const header = b64url(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = cryptoSign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64urlSig(sig)}`;
}

/** Sobe um http server servindo /auth/v1/.well-known/jwks.json. */
async function startJwksServer(jwks) {
  const server = createServer((req, res) => {
    if (req.url === "/auth/v1/.well-known/jwks.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: jwks }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}` };
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

// --- ES256 via JWKS (o que o Supabase assina hoje) ------------------------
//
// Regressão do bug real: o Supabase migrou pra chaves assimétricas e passou a
// assinar com ES256+kid. O server só aceitava HS256, então rejeitava TODO
// cliente logado com 401 — sync silenciosamente morto em web e mobile.

describe("ES256 via JWKS", () => {
  let server;
  let jwksServer;
  let key;
  let otherKey;

  beforeAll(async () => {
    key = makeEs256Key();
    otherKey = makeEs256Key();
    // Só a chave "boa" é publicada no JWKS; a outra serve pra forjar token.
    jwksServer = await startJwksServer([key.jwk]);
    server = await startServer({
      AUTH_MODE: "required",
      SUPABASE_URL: jwksServer.url,
    });
  }, 10000);

  afterAll(async () => {
    await stopServer(server);
    if (jwksServer) await new Promise((r) => jwksServer.server.close(r));
  });

  test("ES256 válido + sub === pathId: aceita", async () => {
    const token = signEs256({
      payload: { sub: "alice", exp: futureExp() },
      kid: key.kid,
      privateKey: key.privateKey,
    });
    const res = await tryConnect(server.port, "alice", token);
    expect(res).toEqual({ open: true });
  });

  test("ES256 válido + sub !== pathId: rejeita com 403", async () => {
    const token = signEs256({
      payload: { sub: "alice", exp: futureExp() },
      kid: key.kid,
      privateKey: key.privateKey,
    });
    const res = await tryConnect(server.port, "bob", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(403);
  });

  test("ES256 assinado por chave fora do JWKS: rejeita com 401", async () => {
    // kid conhecido, chave privada errada — assinatura não confere.
    const token = signEs256({
      payload: { sub: "alice", exp: futureExp() },
      kid: key.kid,
      privateKey: otherKey.privateKey,
    });
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });

  test("ES256 com kid desconhecido: rejeita com 401", async () => {
    const token = signEs256({
      payload: { sub: "alice", exp: futureExp() },
      kid: otherKey.kid,
      privateKey: otherKey.privateKey,
    });
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });

  test("ES256 expirado: rejeita com 401", async () => {
    const token = signEs256({
      payload: { sub: "alice", exp: pastExp() },
      kid: key.kid,
      privateKey: key.privateKey,
    });
    const res = await tryConnect(server.port, "alice", token);
    expect(res.open).toBe(false);
    expect(res.code).toBe(401);
  });
});
