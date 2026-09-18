// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Resolução do alvo das ferramentas de smoke.
//
// Contexto: o flip pra `AUTH_MODE=required` (04/09) quebrou os dois scripts de
// smoke de uma vez, e ninguém percebeu porque eles não rodam no CI. A parte
// que dá pra testar sem abrir socket é esta, e é onde bug moraria: base64url
// mal decodificado, sala que briga com o `sub`, token vazando pra URL errada.

import {
  base64UrlDecode,
  claimsOf,
  diagnose,
  httpBaseOf,
  resolveTarget,
} from "../server/smoke-target.js";

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const jwtFake = (payload) =>
  `${b64url({ alg: "ES256" })}.${b64url(payload)}.sig`;

const SUB = "00c5fe3b-9dc7-4428-a4e8-1c9f5e426b33";
const BASE = "wss://backontrack-sync.mhdn.com.br";

describe("base64UrlDecode", () => {
  it("decodifica a variante URL-safe, com - e _ no lugar de + e /", () => {
    // O trecho abaixo tem os dois caracteres que separam base64url de base64.
    const original = Buffer.from([0xfb, 0xef, 0xbe]); // vira "--++" em base64
    const url = original.toString("base64url");
    expect(url).toMatch(/[-_]/);
    expect(base64UrlDecode(url).equals(original)).toBe(true);
  });

  it("repõe o padding que o base64url corta", () => {
    for (const texto of ["a", "ab", "abc", "abcd", "abcde"]) {
      const url = Buffer.from(texto).toString("base64url");
      expect(base64UrlDecode(url).toString()).toBe(texto);
    }
  });
});

describe("claimsOf", () => {
  it("lê o payload sem verificar assinatura", () => {
    expect(claimsOf(jwtFake({ sub: SUB, exp: 123 }))).toEqual({
      sub: SUB,
      exp: 123,
    });
  });

  it("devolve null pro que não for um JWT legível", () => {
    expect(claimsOf("")).toBeNull();
    expect(claimsOf("a.b")).toBeNull();
    expect(claimsOf("a.b.c.d")).toBeNull();
    expect(claimsOf("a.naoEhJson.c")).toBeNull();
    expect(claimsOf(null)).toBeNull();
    expect(claimsOf(42)).toBeNull();
  });
});

describe("resolveTarget sem token", () => {
  it("usa a sala padrão", () => {
    const t = resolveTarget({ url: BASE });
    expect(t).toMatchObject({ room: "smoke-test", authed: false, sub: null });
    expect(t.wsUrl).toBe(`${BASE}/smoke-test`);
  });

  it("respeita ROOM e a barra sobrando na URL", () => {
    const t = resolveTarget({ url: `${BASE}//`, room: "outra" });
    expect(t.wsUrl).toBe(`${BASE}/outra`);
  });
});

describe("resolveTarget com token", () => {
  it("tira a sala do sub e leva o token na query", () => {
    const token = jwtFake({ sub: SUB });
    const t = resolveTarget({ url: BASE, token });
    expect(t).toMatchObject({ room: SUB, authed: true, sub: SUB });
    expect(t.wsUrl).toBe(`${BASE}/${SUB}?token=${encodeURIComponent(token)}`);
  });

  it("aceita ROOM igual ao sub", () => {
    const token = jwtFake({ sub: SUB });
    expect(resolveTarget({ url: BASE, token, room: SUB }).room).toBe(SUB);
  });

  it("barra ROOM diferente do sub, que o server recusaria com 403", () => {
    const token = jwtFake({ sub: SUB });
    expect(() => resolveTarget({ url: BASE, token, room: "outra" })).toThrow(
      /403/,
    );
  });

  it("explica token ilegível e token sem sub", () => {
    expect(() => resolveTarget({ url: BASE, token: "abc" })).toThrow(/JWT/);
    expect(() =>
      resolveTarget({ url: BASE, token: jwtFake({ exp: 1 }) }),
    ).toThrow(/sub/);
  });
});

describe("httpBaseOf", () => {
  it("troca ws por http mantendo o TLS", () => {
    expect(httpBaseOf("ws://localhost:8787")).toBe("http://localhost:8787");
    expect(httpBaseOf(`${BASE}/`)).toBe("https://backontrack-sync.mhdn.com.br");
  });
});

describe("diagnose", () => {
  const fetchQueDevolve = (body) => async () => ({ json: async () => body });

  it("aponta a falta de token quando o server está em required", async () => {
    const msg = await diagnose({
      baseUrl: BASE,
      authed: false,
      fetchImpl: fetchQueDevolve({ ok: true, authMode: "required" }),
    });
    expect(msg).toMatch(/TOKEN/);
  });

  it("não culpa o token quando a rodada já ia autenticada", async () => {
    const msg = await diagnose({
      baseUrl: BASE,
      authed: true,
      fetchImpl: fetchQueDevolve({ ok: true, authMode: "required" }),
    });
    expect(msg).toMatch(/não foi por falta de token/);
  });

  it("separa server fora do ar de recusa por política", async () => {
    const msg = await diagnose({
      baseUrl: BASE,
      authed: false,
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(msg).toMatch(/healthz/);
  });
});
