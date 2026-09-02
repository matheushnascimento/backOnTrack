// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Valor manual de água (#324). A validação vive fora da tela porque é onde
// bug de entrada mora: texto com unidade junto, zero, número absurdo.

import { MAX_ML, maskMl, parseMl } from "../constants/waterAmount";

describe("parseMl", () => {
  it("aceita um valor comum", () => {
    expect(parseMl("350")).toBe(350);
  });

  it("ignora o que não é dígito, inclusive unidade colada", () => {
    // Colar "350 ml" de algum lugar é o caso mais provável.
    expect(parseMl("350 ml")).toBe(350);
    expect(parseMl("1.000")).toBe(1000);
  });

  it("recusa vazio e zero", () => {
    // Registrar zero ml não é registro, é ruído no histórico.
    expect(parseMl("")).toBeNull();
    expect(parseMl("0")).toBeNull();
    expect(parseMl("000")).toBeNull();
    expect(parseMl(null)).toBeNull();
    expect(parseMl(undefined)).toBeNull();
  });

  it("recusa acima do teto", () => {
    expect(parseMl(String(MAX_ML))).toBe(MAX_ML);
    expect(parseMl(String(MAX_ML + 1))).toBeNull();
  });

  it("recusa texto sem número", () => {
    expect(parseMl("abc")).toBeNull();
    expect(parseMl("ml")).toBeNull();
  });
});

describe("maskMl", () => {
  it("deixa só dígitos enquanto digita", () => {
    expect(maskMl("3a5b0")).toBe("350");
  });

  it("não deixa passar do comprimento do teto", () => {
    // Sem isto o campo aceitaria "99999" e o botão ficaria desabilitado sem
    // explicação, porque o parseMl recusaria depois.
    expect(maskMl("999999")).toBe("9999");
    expect(maskMl("999999").length).toBe(String(MAX_ML).length);
  });

  it("tolera vazio e ausente", () => {
    expect(maskMl("")).toBe("");
    expect(maskMl(undefined)).toBe("");
  });
});
