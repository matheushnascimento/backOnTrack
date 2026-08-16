// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// `isDevSurface` decide se ferramenta de dev aparece (#293). Errar pro lado
// permissivo entrega controles de simulação aos 6 testers; errar pro lado
// restritivo apaga os controles no BoT Staging, que é onde a validação
// acontece pela regra do projeto. Os dois lados custam, então tem teste.

describe("isDevSurface", () => {
  const original = global.__DEV__;

  afterEach(() => {
    global.__DEV__ = original;
    jest.resetModules();
  });

  function comCanal(channel, dev = false) {
    jest.resetModules();
    jest.doMock("expo-updates", () => ({ channel, updateId: null }));
    global.__DEV__ = dev;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/constants/environment").isDevSurface();
  }

  it("aparece em dev", () => {
    expect(comCanal(null, true)).toBe(true);
  });

  it("aparece no canal staging (o BoT Staging)", () => {
    expect(comCanal("staging")).toBe(true);
  });

  // O caso que motivou o gate: os 6 testers rodam no canal preview.
  it("NÃO aparece no canal preview (app dos testers)", () => {
    expect(comCanal("preview")).toBe(false);
  });

  it("não aparece em canal desconhecido", () => {
    expect(comCanal("release")).toBe(false);
    expect(comCanal(null)).toBe(false);
  });
});
