// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// TinyBase WebSocket sync server (M6, ADR-009, #198).
//
// `createWsServer` do TinyBase expõe um endpoint WebSocket. O path da URL
// define o pathId (a "sala"), o server mantém uma `MergeableStore` por sala
// persistida como JSON no volume ($DATA_DIR, default ./data).
//
// Auth (M6 fatia B, #211, ADR-010): quando o cliente manda `?token=<JWT>` na
// URL, o server valida HS256 com `SUPABASE_JWT_SECRET` e enforça que o `sub`
// do JWT bate com o pathId — quem sabe o path sem o token do dono não conecta.
//
// AUTH_MODE controla o que fazer com conexões SEM token:
//   - "optional" (default): aceita anônimo (compat com clientes atuais que
//     usam `syncRoomId` UUID por-install).
//   - "required": rejeita com 401 (modo final, depois que os testers migrarem
//     via fatia C).
//
// TLS termina no cloudflared do host (ver compose.yml + README). Este processo
// só fala WS plano na rede interna.

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { createMergeableStore } from "tinybase";
import { createFilePersister } from "tinybase/persisters/persister-file";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
const AUTH_MODE = process.env.AUTH_MODE ?? "optional";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

if (!["optional", "required"].includes(AUTH_MODE)) {
  console.error(
    `[sync] fatal: AUTH_MODE must be "optional" or "required" (got "${AUTH_MODE}")`,
  );
  process.exit(1);
}
if (AUTH_MODE === "required" && !JWT_SECRET) {
  console.error(
    "[sync] fatal: AUTH_MODE=required requires SUPABASE_JWT_SECRET",
  );
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });

// `pathId` é o que vem depois do host na URL WS (ex.: `/user123`).
// Sanitiza pra nome de arquivo seguro pra nada escapar do $DATA_DIR.
function safeFilename(pathId) {
  const clean = pathId.replace(/[^A-Za-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return `${clean || "default"}.json`;
}

// base64url → Buffer. JWT usa a variante URL-safe (- e _ no lugar de + e /).
function base64UrlDecode(str) {
  const pad = "===".slice((str.length + 3) % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

// Verifica HS256 JWT contra JWT_SECRET. Retorna o payload decodificado.
// Lança em qualquer inconsistência (formato, alg, assinatura, expiração, sub).
function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed jwt");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
  if (header.alg !== "HS256") throw new Error(`unsupported alg: ${header.alg}`);

  const signingInput = `${headerB64}.${payloadB64}`;
  const expected = createHmac("sha256", JWT_SECRET)
    .update(signingInput)
    .digest();
  const actual = base64UrlDecode(sigB64);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("invalid signature");
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("expired");
  if (!payload.sub) throw new Error("no sub claim");

  return payload;
}

const wss = new WebSocketServer({
  port: PORT,
  verifyClient: ({ req }, callback) => {
    const url = new URL(req.url, "http://internal");
    const pathId = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    const token = url.searchParams.get("token");

    if (token) {
      if (!JWT_SECRET) {
        // Cliente mandou token mas o server não pode validar. Recusar é mais
        // seguro que aceitar sem checar.
        console.error(
          "[sync] rejecting: token sent but SUPABASE_JWT_SECRET not set",
        );
        return callback(false, 500, "server missing SUPABASE_JWT_SECRET");
      }
      try {
        const payload = verifyJwt(token);
        if (payload.sub !== pathId) {
          console.warn(
            `[sync] rejecting: jwt.sub="${payload.sub}" != pathId="${pathId}"`,
          );
          return callback(false, 403, "sub != pathId");
        }
        return callback(true);
      } catch (e) {
        console.warn(`[sync] rejecting: invalid token: ${e.message}`);
        return callback(false, 401, `invalid token: ${e.message}`);
      }
    }

    if (AUTH_MODE === "required") {
      console.warn("[sync] rejecting: auth required, no token");
      return callback(false, 401, "auth required");
    }

    // AUTH_MODE=optional + sem token → aceita anônimo (compat).
    callback(true);
  },
});

createWsServer(wss, (pathId) =>
  createFilePersister(
    createMergeableStore(),
    join(DATA_DIR, safeFilename(pathId)),
  ),
);

console.log(
  `[sync] listening on ws://0.0.0.0:${PORT} — data dir: ${DATA_DIR} — auth: ${AUTH_MODE}${JWT_SECRET ? " (secret loaded)" : ""}`,
);
