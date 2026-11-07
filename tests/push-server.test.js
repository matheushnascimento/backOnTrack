// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Lembretes por Web Push no server (#417).
//
// Duas partes: a agenda e o disparo direto no `server/push.js`, com um
// `enviar` falso no lugar do serviço de push; e as rotas HTTP com o server de
// pé, que é onde moram o login, o CORS e a validação.

import { createHmac } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import webpush from "web-push";

import { ATRASO_MAX_MS, criarPush, validarAgenda } from "../server/push.js";
import { startSyncServer, stopSyncServer } from "./support/syncServer";

const MIN = 60_000;
const AGORA = Date.UTC(2026, 10, 6, 15, 0);

const inscricao = {
  endpoint: "https://push.exemplo/abc",
  keys: { p256dh: "chave-publica", auth: "segredo" },
};

const aviso = (minutos, body = "Hora do seu cuidado.") => ({
  at: AGORA + minutos * MIN,
  title: "Back on Track",
  body,
});

const agenda = (tipo, avisos, aparelho = "aparelho-1") => ({
  aparelho,
  inscricao,
  tipo,
  avisos,
});

const silencioso = { warn: () => {}, error: () => {} };

describe("validarAgenda", () => {
  it("aceita a agenda e ordena os avisos", () => {
    const lido = validarAgenda(agenda("sono", [aviso(30), aviso(10)]), AGORA);
    expect(lido.ok).toBe(true);
    expect(lido.valor.avisos.map((a) => a.at)).toEqual([
      AGORA + 10 * MIN,
      AGORA + 30 * MIN,
    ]);
  });

  it("descarta calado o aviso já passado e o longe demais", () => {
    const lido = validarAgenda(
      agenda("foco", [aviso(-60), aviso(5), aviso(60 * 24 * 20)]),
      AGORA,
    );
    expect(lido.valor.avisos).toHaveLength(1);
  });

  it("recusa tipo, aparelho, inscrição e aviso fora do formato", () => {
    expect(validarAgenda(agenda("agua", []), AGORA).ok).toBe(false);
    expect(validarAgenda(agenda("sono", [], "../x"), AGORA).ok).toBe(false);
    expect(
      validarAgenda(
        {
          ...agenda("sono", []),
          inscricao: { ...inscricao, endpoint: "http://x" },
        },
        AGORA,
      ).ok,
    ).toBe(false);
    expect(
      validarAgenda(
        agenda("sono", [{ at: AGORA, title: "", body: "x" }]),
        AGORA,
      ).ok,
    ).toBe(false);
    expect(validarAgenda(null, AGORA).ok).toBe(false);
  });

  it("guarda só o que precisa da inscrição", () => {
    const lido = validarAgenda(
      { ...agenda("sono", []), inscricao: { ...inscricao, extra: "x" } },
      AGORA,
    );
    expect(lido.valor.inscricao).toEqual(inscricao);
  });
});

describe("criarPush", () => {
  let dir, agora, enviados, falha, push;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "push-test-"));
    agora = AGORA;
    enviados = [];
    falha = null;
    push = novo();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function novo() {
    return criarPush({
      dir,
      agora: () => agora,
      log: silencioso,
      enviar: async (insc, payload) => {
        if (falha) throw falha;
        enviados.push({ endpoint: insc.endpoint, ...JSON.parse(payload) });
      },
    });
  }

  it("manda o que venceu, uma vez só, com o tipo na tag", async () => {
    push.gravarAgenda("conta", agenda("sono", [aviso(1), aviso(60)]));
    agora = AGORA + 2 * MIN;
    expect(await push.disparar()).toBe(1);
    expect(enviados).toEqual([
      {
        endpoint: inscricao.endpoint,
        title: "Back on Track",
        body: "Hora do seu cuidado.",
        tag: "sono",
      },
    ]);
    expect(await push.disparar()).toBe(0);
  });

  it("a agenda nova substitui a do mesmo tipo e preserva as outras", async () => {
    push.gravarAgenda("conta", agenda("foco", [aviso(1, "foco")]));
    push.gravarAgenda("conta", agenda("sono", [aviso(1, "sono velho")]));
    // Registrou o sono: a agenda nova vem sem o aviso de hoje.
    push.gravarAgenda("conta", agenda("sono", []));
    agora = AGORA + 2 * MIN;
    await push.disparar();
    expect(enviados.map((e) => e.body)).toEqual(["foco"]);
  });

  it("aviso atrasado demais não sai", async () => {
    push.gravarAgenda("conta", agenda("remedio", [aviso(1)]));
    agora = AGORA + MIN + ATRASO_MAX_MS + MIN;
    expect(await push.disparar()).toBe(0);
    expect(enviados).toEqual([]);
  });

  it("inscrição recusada com 410 tira o aparelho", async () => {
    push.gravarAgenda("conta", agenda("sono", [aviso(1), aviso(2)]));
    push.gravarAgenda("conta", agenda("foco", [aviso(90)]));
    falha = Object.assign(new Error("gone"), { statusCode: 410 });
    agora = AGORA + 3 * MIN;
    await push.disparar();
    falha = null;
    agora = AGORA + 91 * MIN;
    expect(await push.disparar()).toBe(0);
  });

  it("outra falha perde só aquele aviso", async () => {
    push.gravarAgenda("conta", agenda("sono", [aviso(1), aviso(10)]));
    falha = Object.assign(new Error("boom"), { statusCode: 500 });
    agora = AGORA + 2 * MIN;
    await push.disparar();
    falha = null;
    agora = AGORA + 11 * MIN;
    expect(await push.disparar()).toBe(1);
  });

  it("sobrevive a um reinício: a agenda está no disco", async () => {
    push.gravarAgenda("conta", agenda("sono", [aviso(5)]));
    expect(readdirSync(dir)).toEqual(["conta.json"]);
    push = novo();
    agora = AGORA + 6 * MIN;
    expect(await push.disparar()).toBe(1);
  });

  it("apagar o aparelho cala tudo dele", async () => {
    push.gravarAgenda("conta", agenda("sono", [aviso(1)]));
    push.apagarAparelho("conta", "aparelho-1");
    agora = AGORA + 2 * MIN;
    expect(await push.disparar()).toBe(0);
  });

  it("contas não se misturam", async () => {
    push.gravarAgenda("a", agenda("sono", [aviso(1)]));
    push.gravarAgenda("b", agenda("sono", [aviso(30)]));
    agora = AGORA + 2 * MIN;
    expect(await push.disparar()).toBe(1);
  });

  it("teto de aparelhos por conta", () => {
    for (let i = 0; i < 10; i++) {
      expect(
        push.gravarAgenda("conta", agenda("sono", [], `aparelho-${i}0`)),
      ).toBe(true);
    }
    expect(push.gravarAgenda("conta", agenda("sono", [], "aparelho-xx"))).toBe(
      false,
    );
    // O que já existe continua podendo atualizar.
    expect(push.gravarAgenda("conta", agenda("foco", [], "aparelho-00"))).toBe(
      true,
    );
  });
});

// --- Rotas, com o server de pé ---------------------------------------------

const SECRET = "test-jwt-secret-do-not-use-in-prod-please";

/**
 * Pedido HTTP pelo Node. O `fetch` do ambiente do jest-expo não é o do Node,
 * e devolve resposta sem `status`.
 */
function pedir(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((cumprir, rejeitar) => {
    const req = httpRequest(url, { method, headers }, (res) => {
      let texto = "";
      res.on("data", (c) => {
        texto += c;
      });
      res.on("end", () =>
        cumprir({
          status: res.statusCode,
          headers: res.headers,
          json: () => JSON.parse(texto),
        }),
      );
    });
    req.on("error", rejeitar);
    req.end(body);
  });
}

function b64url(v) {
  return Buffer.from(v)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function token(sub) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 600 }),
  );
  const sig = createHmac("sha256", SECRET)
    .update(`${head}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${head}.${body}.${sig}`;
}

describe("rotas do push", () => {
  const chaves = webpush.generateVAPIDKeys();
  let servidor, base;

  beforeAll(async () => {
    servidor = await startSyncServer({
      AUTH_MODE: "required",
      SUPABASE_JWT_SECRET: SECRET,
      VAPID_PUBLIC_KEY: chaves.publicKey,
      VAPID_PRIVATE_KEY: chaves.privateKey,
    });
    base = `http://127.0.0.1:${servidor.port}`;
  });
  afterAll(() => stopSyncServer(servidor));

  const corpo = (
    avisos = [{ at: Date.now() + 60 * MIN, title: "t", body: "b" }],
  ) => JSON.stringify({ ...agenda("sono", avisos, "aparelho-web-1"), avisos });

  it("a chave pública é aberta", async () => {
    const r = await pedir(`${base}/push/chave`);
    expect(r.status).toBe(200);
    expect(r.json()).toEqual({ publicKey: chaves.publicKey });
  });

  it("o preflight libera o header do token", async () => {
    const r = await pedir(`${base}/push/agenda`, { method: "OPTIONS" });
    expect(r.status).toBe(204);
    expect(r.headers["access-control-allow-headers"]).toMatch(/authorization/);
  });

  it("sem login, 401", async () => {
    const r = await pedir(`${base}/push/agenda`, {
      method: "PUT",
      body: corpo(),
    });
    expect(r.status).toBe(401);
  });

  it("agenda fora do formato, 400", async () => {
    const r = await pedir(`${base}/push/agenda`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token("conta-1")}` },
      body: JSON.stringify({ tipo: "sono" }),
    });
    expect(r.status).toBe(400);
  });

  it("grava a agenda na pasta do push, separada das salas", async () => {
    const r = await pedir(`${base}/push/agenda`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token("conta-1")}` },
      body: corpo(),
    });
    expect(r.status).toBe(204);
    expect(readdirSync(join(servidor.dataDir, "push"))).toEqual([
      "conta-1.json",
    ]);
    expect(readdirSync(servidor.dataDir)).toEqual(["push"]);
  });

  it("apaga o aparelho", async () => {
    const r = await pedir(`${base}/push/aparelhos/aparelho-web-1`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token("conta-1")}` },
    });
    expect(r.status).toBe(204);
  });
});

describe("sem as chaves VAPID", () => {
  let servidor;
  beforeAll(async () => {
    servidor = await startSyncServer({ SUPABASE_JWT_SECRET: SECRET });
  });
  afterAll(() => stopSyncServer(servidor));

  it("o push fica desligado, e o sync segue", async () => {
    const r = await pedir(`http://127.0.0.1:${servidor.port}/push/chave`);
    expect(r.status).toBe(503);
    const saude = await pedir(`http://127.0.0.1:${servidor.port}/healthz`);
    expect(saude.status).toBe(200);
  });
});
