// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// TinyBase WebSocket sync server (M6, ADR-009, #198).
//
// `createWsServer` do TinyBase expõe um endpoint WebSocket. O path da URL
// define o pathId (a "sala"), o server mantém uma `MergeableStore` por sala
// persistida como JSON no volume ($DATA_DIR, default ./data).
//
// Auth (M6 fatia B, #211, ADR-010): quando o cliente manda `?token=<JWT>` na
// URL, o server valida a assinatura e enforça que o `sub` do JWT bate com o
// pathId: quem sabe o path sem o token do dono não conecta.
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
//
// Desde a #417 o mesmo processo dispara os lembretes por Web Push do app web
// (`push.js`). Liga só com as chaves VAPID no env.

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
import webpush from "web-push";
import { WebSocketServer } from "ws";

import { criarPush, validarAgenda } from "./push.js";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
const AUTH_MODE = process.env.AUTH_MODE ?? "optional";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";
// URL base do projeto Supabase (ex.: https://abc.supabase.co). Necessária pra
// validar tokens ES256, porque é dela que sai o endpoint JWKS.
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  : "";

// Um dos dois é suficiente pra validar token: JWKS (ES256) ou secret (HS256).
const CAN_VERIFY = Boolean(JWKS_URL || JWT_SECRET);

// Web Push (#417). Gerar o par uma vez com `npx web-push generate-vapid-keys`
// e guardar no `.env`: trocar as chaves invalida todas as inscrições.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? "https://backontrack.mhdn.com.br";
const PUSH_ATIVO = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && CAN_VERIFY);
/** De quanto em quanto tempo o disparo olha a agenda. */
const PUSH_INTERVALO_MS = 30_000;

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

/**
 * O `sub` de um token, SEM verificar assinatura. Só pra log (#361).
 *
 * Nunca usar isto pra decidir acesso: quem autoriza é o `verifyJwt`. Aqui o
 * token já foi recusado, e o nome serve pra saber de qual cliente veio.
 *
 * @param {string} token
 * @returns {string|null}
 */
function claimSub(token) {
  try {
    const partes = String(token).split(".");
    if (partes.length !== 3) return null;
    const sub = JSON.parse(base64UrlDecode(partes[1]).toString("utf8"))?.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
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
    // Refetch recente demais, então usa o cache atual (kid segue desconhecido).
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
    // Assinatura JWT ES256 é R||S cru (64 bytes), e não DER, daí o
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
// Só que o 401 **não atravessa** até o cliente. A API WebSocket de browser e
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
  if (rota.startsWith("/push/")) {
    rotaDoPush(req, res, rota).catch((e) => {
      console.error(`[push] erro na rota ${rota}: ${e.message}`);
      if (!res.headersSent) responder(res, 500, { erro: "interno" });
    });
    return;
  }
  if (req.method === "GET" && rota === "/healthz") {
    const corpo = JSON.stringify({ ok: true, authMode: AUTH_MODE });
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(corpo),
      // O app é servido de outra origem (e no native não há origem). Só
      // devolve o modo de auth, e nada aqui é segredo.
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

// --- Web Push (#417) ------------------------------------------------------

if (PUSH_ATIVO) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
const push = PUSH_ATIVO
  ? criarPush({
      dir: join(DATA_DIR, "push"),
      // TTL: o serviço de push segura o aviso por no máximo meia hora se o
      // aparelho estiver fora da rede. Depois disso, o lembrete perdeu a hora.
      enviar: (inscricao, payload) =>
        webpush.sendNotification(inscricao, payload, { TTL: 1800 }),
    })
  : null;
if (push) {
  setInterval(() => {
    push.disparar().catch((e) => console.error(`[push] disparo: ${e.message}`));
  }, PUSH_INTERVALO_MS);
}

// O app web é servido de outra origem. Liberar qualquer origem não abre nada:
// a identidade vem do token no header, e não de cookie.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

function responder(res, status, corpo) {
  const texto = corpo == null ? "" : JSON.stringify(corpo);
  res.writeHead(status, {
    ...CORS,
    "cache-control": "no-store",
    ...(texto ? { "content-type": "application/json" } : {}),
  });
  res.end(texto);
}

/** Corpo JSON com teto de tamanho. `null` se não for JSON válido. */
async function lerCorpo(req, limite = 64 * 1024) {
  let tamanho = 0;
  const partes = [];
  for await (const parte of req) {
    tamanho += parte.length;
    if (tamanho > limite) return null;
    partes.push(parte);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    return null;
  }
}

/** O `sub` do token no `Authorization`, ou `null`. Push sempre exige login. */
async function contaDoPedido(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  if (!m) return null;
  try {
    return (await verifyJwt(m[1])).sub;
  } catch {
    return null;
  }
}

async function rotaDoPush(req, res, rota) {
  if (req.method === "OPTIONS") return responder(res, 204);
  if (!push) return responder(res, 503, { erro: "push desligado" });

  if (req.method === "GET" && rota === "/push/chave") {
    return responder(res, 200, { publicKey: VAPID_PUBLIC_KEY });
  }

  const sub = await contaDoPedido(req);
  if (!sub) return responder(res, 401, { erro: "login necessário" });

  if (req.method === "PUT" && rota === "/push/agenda") {
    const lido = validarAgenda(await lerCorpo(req));
    if (!lido.ok) return responder(res, 400, { erro: lido.erro });
    if (!push.gravarAgenda(sub, lido.valor)) {
      return responder(res, 409, { erro: "aparelhos demais" });
    }
    return responder(res, 204);
  }

  const apagar = /^\/push\/aparelhos\/([A-Za-z0-9_-]{8,64})$/.exec(rota);
  if (req.method === "DELETE" && apagar) {
    push.apagarAparelho(sub, apagar[1]);
    return responder(res, 204);
  }

  return responder(res, 404, { erro: "rota desconhecida" });
}

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
      // verifyJwt é async (JWKS pode precisar de fetch), e o callback do
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
          // O `sub` vai junto pra dar nome ao ruído (#361). Com várias salas,
          // "invalid token: expired" sozinho não diz QUEM está no laço, e a
          // resposta exigia adivinhação. O claim é legível mesmo com a
          // assinatura vencida ou inválida, porque só a verificação falhou, e
          // não a decodificação.
          //
          // Isto é log, e nunca autorização: quem decide é o `verifyJwt`, que
          // já rejeitou. Um `sub` forjado suja o log e não abre porta nenhuma.
          console.warn(
            `[sync] rejecting: invalid token: ${e.message} (sub=${claimSub(token) ?? "ilegível"}, pathId="${pathId}")`,
          );
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
  // A porta EFETIVA, e não a pedida. Com `PORT=0` o SO escolhe uma livre, e é
  // assim que os testes sobem o server: porta sorteada colide de vez em
  // quando, e colisão vira `EADDRINUSE` com saída código 1, que era a falha
  // intermitente do #342. Quem lê esta linha precisa do número real.
  const porta = httpServer.address()?.port ?? PORT;
  console.log(
    `[sync] listening on ws://0.0.0.0:${porta} | data dir: ${DATA_DIR} | auth: ${AUTH_MODE}${verifiers ? ` (${verifiers})` : ""} | push: ${PUSH_ATIVO ? "on" : "off"}`,
  );
});
