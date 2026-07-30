// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testa o helper buildSyncUrl (M6 auth fatia C). É o único pedaço puro de
// infra/sync.js — a lógica de montagem/encoding da URL onde bug moraria
// (roomId com espaço, JWT com `+`/`=`, mistura de logado/deslogado).

import { buildSyncUrl } from "../infra/sync-url";

describe("buildSyncUrl", () => {
  const BASE = "wss://backontrack-sync.mhdn.com.br";

  test("sem baseUrl retorna null (sync desligado)", () => {
    expect(buildSyncUrl("", "room-1", null)).toBeNull();
    expect(buildSyncUrl(null, "room-1", null)).toBeNull();
    expect(buildSyncUrl(undefined, "room-1", null)).toBeNull();
  });

  test("sem roomId retorna null (persistência ainda não carregou)", () => {
    expect(buildSyncUrl(BASE, "", null)).toBeNull();
    expect(buildSyncUrl(BASE, null, null)).toBeNull();
    expect(buildSyncUrl(BASE, undefined, null)).toBeNull();
  });

  test("anônimo (sem token): URL só com path do roomId", () => {
    const url = buildSyncUrl(BASE, "abc-123-uuid", null);
    expect(url).toBe(`${BASE}/abc-123-uuid`);
    // Sem query string.
    expect(url).not.toContain("?");
  });

  test("logado: URL com path + ?token=", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSJ9.sig";
    const url = buildSyncUrl(BASE, "user-uuid", jwt);
    expect(url).toBe(`${BASE}/user-uuid?token=${encodeURIComponent(jwt)}`);
    expect(url).toContain("?token=");
  });

  test("encoding: caracteres URL-unsafe no roomId viram %XX", () => {
    // roomId hipotético com espaço + slash — não deve vazar pra URL.
    const url = buildSyncUrl(BASE, "a b/c", null);
    // encodeURIComponent transforma " " em "%20" e "/" em "%2F".
    expect(url).toBe(`${BASE}/a%20b%2Fc`);
  });

  test("encoding: JWT com + e = do base64 padded vira %2B / %3D", () => {
    // Cenário real: JWT tem . como separador (safe em URL), mas se algum
    // caractere não-safe vazar (padding = ou versão base64 padrão com +/), o
    // encoding tem que proteger o query.
    const token = "abc+def=xyz";
    const url = buildSyncUrl(BASE, "room", token);
    expect(url).toBe(`${BASE}/room?token=abc%2Bdef%3Dxyz`);
  });

  test("roomId numérico é aceito (String() coerção)", () => {
    // useValue pode retornar tipos diferentes conforme a store — proteja o
    // template string de virar `[object Object]` ou `undefined`.
    expect(buildSyncUrl(BASE, 42, null)).toBe(`${BASE}/42`);
  });
});
