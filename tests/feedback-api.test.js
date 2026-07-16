// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes da função serverless api/feedback.js (M4, #137). Mocka o fetch — nada
// de GitHub real nem rede. Exercita validações, montagem do corpo da issue e a
// compat do #116 (payload legado com `device` vs novo com `environment`).
import handler from "../api/feedback.js";

// req/res no formato do handler da Vercel.
function mockReq({ method = "POST", headers = {}, body = {} } = {}) {
  return { method, headers, body };
}
function mockRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b) => {
    res.body = b;
    return res;
  };
  res.end = () => res;
  return res;
}

// Resposta fake de sucesso do GitHub.
function ghOk() {
  return {
    ok: true,
    json: async () => ({
      html_url: "https://github.com/x/y/issues/42",
      number: 42,
    }),
  };
}

/** Roda o handler e devolve o res preenchido. */
async function call(reqInit) {
  const res = mockRes();
  await handler(mockReq(reqInit), res);
  return res;
}

/** Corpo enviado ao GitHub na 1ª (única) chamada de fetch. */
function ghPayload() {
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV, GITHUB_ISSUE_TOKEN: "test-token" };
  delete process.env.FEEDBACK_KEY;
  global.fetch = jest.fn(async () => ghOk());
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.env = OLD_ENV;
  jest.restoreAllMocks();
});

describe("guardas / validação", () => {
  test("OPTIONS → 204 e não chama o GitHub", async () => {
    const res = await call({ method: "OPTIONS" });
    expect(res.statusCode).toBe(204);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("método != POST → 405", async () => {
    const res = await call({ method: "GET" });
    expect(res.statusCode).toBe(405);
  });

  test("FEEDBACK_KEY definido + header errado → 401", async () => {
    process.env.FEEDBACK_KEY = "segredo";
    const res = await call({
      headers: { "x-feedback-key": "errado" },
      body: { title: "x" },
    });
    expect(res.statusCode).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("FEEDBACK_KEY definido + header certo → passa (201)", async () => {
    process.env.FEEDBACK_KEY = "segredo";
    const res = await call({
      headers: { "x-feedback-key": "segredo" },
      body: { title: "ok" },
    });
    expect(res.statusCode).toBe(201);
  });

  test("sem GITHUB_ISSUE_TOKEN → 500", async () => {
    delete process.env.GITHUB_ISSUE_TOKEN;
    const res = await call({ body: { title: "x" } });
    expect(res.statusCode).toBe(500);
  });

  test("título e descrição vazios → 400", async () => {
    const res = await call({ body: { title: "  ", body: "" } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("empty_feedback");
  });
});

describe("montagem da issue", () => {
  test("payload NOVO: Ambiente/Bundle/User agent, sem Dispositivo", async () => {
    await call({
      body: {
        title: "Bugou",
        body: "não abre",
        category: "Bug",
        environment: "App nativo (Android 36)",
        appVersion: "1.0.0",
        bundle: "OTA 1a2b3c4d",
        userAgent: "",
      },
    });
    const p = ghPayload();
    expect(p.title).toBe("[Bug] Bugou");
    expect(p.labels).toEqual(["tester-feedback"]);
    expect(p.body).toContain("- Ambiente: App nativo (Android 36)");
    expect(p.body).toContain("- Bundle: OTA 1a2b3c4d");
    expect(p.body).not.toContain("- Dispositivo:");
  });

  test("payload LEGADO (device) segue renderizando — compat #116", async () => {
    await call({
      body: {
        title: "antigo",
        category: "Bug",
        device: "android 36",
        appVersion: "1.0.0",
      },
    });
    const p = ghPayload();
    expect(p.body).toContain("- Dispositivo: android 36");
    expect(p.body).not.toContain("- Ambiente:");
  });

  test("user agent entra quando é web", async () => {
    await call({
      body: {
        title: "web",
        environment: "Navegador",
        userAgent: "Mozilla/5.0 Chrome/131",
      },
    });
    expect(ghPayload().body).toContain("- User agent: Mozilla/5.0 Chrome/131");
  });

  test("sem título: usa a descrição como título (com prefixo de categoria)", async () => {
    await call({ body: { body: "só descrição aqui", category: "Sugestão" } });
    expect(ghPayload().title).toBe("[Sugestão] só descrição aqui");
  });

  test("chama o repo default com o label certo", async () => {
    await call({ body: { title: "x" } });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/matheushnascimento/backOnTrack/issues",
    );
  });
});

describe("resultado", () => {
  test("sucesso → 201 com url e number do GitHub", async () => {
    const res = await call({ body: { title: "ok" } });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      url: "https://github.com/x/y/issues/42",
      number: 42,
    });
  });

  test("erro do GitHub → 502", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 422,
      text: async () => "boom",
    }));
    const res = await call({ body: { title: "ok" } });
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe("github_error");
  });
});
