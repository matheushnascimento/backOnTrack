// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// TinyBase WebSocket sync server (M6, ADR-009, #198).
//
// `createWsServer` do TinyBase expõe um endpoint WebSocket. O path da URL
// define o pathId (a "sala"), o server mantém uma `MergeableStore` por sala
// persistida como JSON no volume ($DATA_DIR, default ./data).
//
// Auth (M6 fatia B, #211, ADR-010): quando o cliente manda `?token=<JWT>` na
// URL, o server valida a assinatura e enforça que o `sub` do JWT bate com o
// pathId — quem sabe o path sem o token do dono não conecta.
//
// Dois algoritmos são aceitos:
//   - **ES256** (padrão atual do Supabase): chaves assimétricas ECC P-256. A
//     chave pública vem do JWKS do projeto (`$SUPABASE_URL/auth/v1/.well-known
//     /jwks.json`), selecionada pelo `kid` do header. Cache em memória, com
//     refetch quando aparece um `kid` desconhecido (cobre rotação de chave).
//   - **HS256** (legado): secret simétrico compartilhado em
//     `SUPABASE_JWT_SECRET`. Mantido pra projetos que ainda não migraram e
//     pros testes.
//
// AUTH_MODE controla o que fazer com conexões SEM token:
//   - "optional" (default): aceita anônimo (compat com clientes atuais que
//     usam `syncRoomId` UUID por-install).
//   - "required": rejeita com 401 (modo final, depois que os testers migrarem
//     via fatia C).
//
// TLS termina no cloudflared do host (ver compose.yml + README). Este processo
// só fala WS plano na rede interna.

import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";

import { createMergeableStore } from "tinybase";
import { createFilePersister } from "tinybase/persisters/persister-file";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
const AUTH_MODE = process.env.AUTH_MODE ?? "optional";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";
// URL base do projeto Supabase (ex.: https://abc.supabase.co). Necessária pra
// validar tokens ES256 — é dela que sai o endpoint JWKS.
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  : "";

// Um dos dois é suficiente pra validar token: JWKS (ES256) ou secret (HS256).
const CAN_VERIFY = Boolean(JWKS_URL || JWT_SECRET);

if (!["optional", "required"].includes(AUTH_MODE)) {
  console.error(
    `[sync] fatal: AUTH_MODE must be "optional" or "required" (got "${AUTH_MODE}")`,
  );
  process.exit(1);
}
if (AUTH_MODE === "required" && !CAN_VERIFY) {
  console.error(
    "[sync] fatal: AUTH_MODE=required requires SUPABASE_URL (ES256) or SUPABASE_JWT_SECRET (HS256)",
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

// Cache de chaves públicas do JWKS, indexado por `kid`. O Supabase rotaciona
// chaves raramente; um kid desconhecido dispara refetch (com throttle pra um
// token forjado não virar vetor de DoS contra o endpoint).
const jwksCache = new Map();
let jwksFetchedAt = 0;
const JWKS_MIN_REFETCH_MS = 60_000;

async function fetchJwks() {
  if (!JWKS_URL) throw new Error("SUPABASE_URL not set, cannot verify ES256");
  const now = Date.now();
  if (now - jwksFetchedAt < JWKS_MIN_REFETCH_MS && jwksCache.size > 0) {
    // Refetch recente demais — usa o cache atual (kid segue desconhecido).
    return;
  }
  jwksFetchedAt = now;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const { keys } = await res.json();
  if (!Array.isArray(keys)) throw new Error("jwks has no keys array");
  jwksCache.clear();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    try {
      jwksCache.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
    } catch (e) {
      console.warn(`[sync] skipping unusable jwk kid=${jwk.kid}: ${e.message}`);
    }
  }
  console.log(`[sync] jwks loaded: ${jwksCache.size} key(s)`);
}

async function getPublicKey(kid) {
  if (!kid) throw new Error("no kid in header");
  if (!jwksCache.has(kid)) await fetchJwks();
  const key = jwksCache.get(kid);
  if (!key) throw new Error(`unknown kid: ${kid}`);
  return key;
}

// Verifica JWT (ES256 via JWKS, ou HS256 via secret). Retorna o payload
// decodificado. Lança em qualquer inconsistência (formato, alg, assinatura,
// expiração, sub).
async function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed jwt");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
  const signingInput = `${headerB64}.${payloadB64}`;
  const actual = base64UrlDecode(sigB64);

  if (header.alg === "ES256") {
    const key = await getPublicKey(header.kid);
    // Assinatura JWT ES256 é R||S cru (64 bytes), não DER — daí o
    // dsaEncoding ieee-p1363, senão o Node rejeita tudo como inválido.
    const ok = verify(
      "sha256",
      Buffer.from(signingInput),
      { key, dsaEncoding: "ieee-p1363" },
      actual,
    );
    if (!ok) throw new Error("invalid signature");
  } else if (header.alg === "HS256") {
    if (!JWT_SECRET) throw new Error("HS256 token but no SUPABASE_JWT_SECRET");
    const expected = createHmac("sha256", JWT_SECRET)
      .update(signingInput)
      .digest();
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new Error("invalid signature");
    }
  } else {
    throw new Error(`unsupported alg: ${header.alg}`);
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("expired");
  if (!payload.sub) throw new Error("no sub claim");

  return payload;
}

// Servidor HTTP na frente do WS, por um motivo só: anunciar o AUTH_MODE (#278).
//
// Quando o server recusa uma conexão sem token, ele responde 401 no handshake
// — mas o 401 **não atravessa** até o cliente. A API WebSocket de browser e
// React Native não expõe o status HTTP de um handshake que falhou; o app vê
// só um `close` genérico, indistinguível de queda de rede. Sem isto, o tester
// sem login veria "sem conexão" e um "Tentar de novo" que nunca funciona.
//
// Alternativas descartadas:
//   - **Inferir no client** ("falhou e não tenho sessão ⇒ preciso entrar"):
//     mente em `AUTH_MODE=optional`, onde a mesma falha é rede de verdade.
//   - **Aceitar o upgrade e fechar com close code 4001** (esse o cliente lê):
//     aceitar faz o `createWsServer` registrar a conexão e criar o persister,
//     ou seja um arquivo de sala por conexão rejeitada. É o lixo da #277 de
//     volta, agora automatizado.
//
// Então: a recusa continua no `verifyClient` (nada é alocado pra quem não
// passa) e o cliente pergunta o modo aqui, só quando falha sem token.
const httpServer = createServer((req, res) => {
  const rota = (req.url ?? "").split("?")[0].replace(/\/+$/, "") || "/";
  if (req.method === "GET" && rota === "/healthz") {
    const corpo = JSON.stringify({ ok: true, authMode: AUTH_MODE });
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(corpo),
      // O app é servido de outra origem (e no native não há origem). Só
      // devolve o modo de auth — nada aqui é segredo.
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    });
    res.end(corpo);
    return;
  }
  // Qualquer outra coisa segue como antes: este endpoint é de WebSocket.
  res.writeHead(426, { "content-type": "text/plain" });
  res.end("Upgrade Required");
});

const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ req }, callback) => {
    const url = new URL(req.url, "http://internal");
    const pathId = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    const token = url.searchParams.get("token");

    if (token) {
      if (!CAN_VERIFY) {
        // Cliente mandou token mas o server não pode validar. Recusar é mais
        // seguro que aceitar sem checar.
        console.error(
          "[sync] rejecting: token sent but neither SUPABASE_URL nor SUPABASE_JWT_SECRET set",
        );
        return callback(false, 500, "server cannot verify tokens");
      }
      // verifyJwt é async (JWKS pode precisar de fetch) — o callback do
      // verifyClient aceita resolução assíncrona.
      verifyJwt(token)
        .then((payload) => {
          if (payload.sub !== pathId) {
            console.warn(
              `[sync] rejecting: jwt.sub="${payload.sub}" != pathId="${pathId}"`,
            );
            return callback(false, 403, "sub != pathId");
          }
          return callback(true);
        })
        .catch((e) => {
          console.warn(`[sync] rejecting: invalid token: ${e.message}`);
          callback(false, 401, `invalid token: ${e.message}`);
        });
      return;
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

const verifiers = [
  JWKS_URL ? "ES256 via jwks" : null,
  JWT_SECRET ? "HS256 via secret" : null,
]
  .filter(Boolean)
  .join(" + ");

// O log sai DENTRO do callback do listen: os testes usam essa linha como
// sinal de "já bindou" pra começar a conectar. Emitir antes abriria uma
// corrida em que o teste conecta num socket que ainda não existe.
httpServer.listen(PORT, () => {
  console.log(
    `[sync] listening on ws://0.0.0.0:${PORT} — data dir: ${DATA_DIR} — auth: ${AUTH_MODE}${verifiers ? ` (${verifiers})` : ""}`,
  );
});
