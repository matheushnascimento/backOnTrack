// @ts-nocheck -- globals do jest não são tipados (ADR-002)
import {
  firstName,
  getGreeting,
  pickName,
  saudacaoPorHora,
} from "@/constants/greeting";

describe("firstName", () => {
  it("corta no primeiro espaço", () => {
    expect(firstName("Matheus Henrique Nascimento")).toBe("Matheus");
  });

  it("preserva acento: a regra é letra Unicode, não [a-z]", () => {
    expect(firstName("João da Silva")).toBe("João");
    expect(firstName("Ângela Souza")).toBe("Ângela");
  });

  it("corta no ponto (caso do localpart de email)", () => {
    expect(firstName("matheus.mhddn")).toBe("matheus");
  });

  it("corta em dígito", () => {
    expect(firstName("José123")).toBe("José");
  });

  it("ignora espaço em volta", () => {
    expect(firstName("  Pedro  ")).toBe("Pedro");
  });

  it("devolve vazio quando não começa com letra", () => {
    expect(firstName("123")).toBe("");
    expect(firstName("   ")).toBe("");
    expect(firstName("")).toBe("");
    expect(firstName(null)).toBe("");
    expect(firstName(undefined)).toBe("");
  });

  // Comportamento consciente, não bug: a regra é "quebrar no primeiro
  // não-alfabético". Se um dia apóstrofo/hífen tiverem que sobreviver, é
  // aqui que o teste vai mudar junto.
  it("corta em apóstrofo e hífen", () => {
    expect(firstName("D'Angelo")).toBe("D");
    expect(firstName("Ana-Maria")).toBe("Ana");
  });
});

describe("pickName", () => {
  it("prefere o displayName ao email", () => {
    expect(pickName({ email: "outro@x.com" }, "Ana")).toBe("Ana");
  });

  it("aplica primeiro-nome no displayName, era o bug do #268", () => {
    expect(pickName(null, "Matheus Henrique Nascimento")).toBe("Matheus");
  });

  it("só força a inicial do displayName, preserva o resto da grafia", () => {
    expect(pickName(null, "matheus")).toBe("Matheus");
    expect(pickName(null, "McArthur Silva")).toBe("McArthur");
  });

  it("cai no email quando displayName está vazio ou é só símbolo", () => {
    expect(pickName({ email: "matheus.mhddn@gmail.com" }, "")).toBe("Matheus");
    expect(pickName({ email: "matheus.mhddn@gmail.com" }, "   ")).toBe(
      "Matheus",
    );
    expect(pickName({ email: "matheus@gmail.com" }, "123")).toBe("Matheus");
  });

  it("normaliza caixa no email, que é derivado e não escolhido", () => {
    expect(pickName({ email: "MATHEUS.MHDDN@gmail.com" }, null)).toBe(
      "Matheus",
    );
  });

  it("devolve vazio sem user e sem displayName", () => {
    expect(pickName(null, null)).toBe("");
    expect(pickName(undefined, "")).toBe("");
    expect(pickName({}, "")).toBe("");
  });
});

describe("saudacaoPorHora", () => {
  it("vira nas fronteiras 12 e 18", () => {
    expect(saudacaoPorHora(0)).toBe("Bom dia");
    expect(saudacaoPorHora(11)).toBe("Bom dia");
    expect(saudacaoPorHora(12)).toBe("Boa tarde");
    expect(saudacaoPorHora(17)).toBe("Boa tarde");
    expect(saudacaoPorHora(18)).toBe("Boa noite");
    expect(saudacaoPorHora(23)).toBe("Boa noite");
  });
});

describe("getGreeting", () => {
  it("monta cumprimento + primeiro nome", () => {
    expect(getGreeting(null, "Matheus Henrique", 9)).toBe("Bom dia, Matheus.");
    expect(getGreeting(null, "Ana", 14)).toBe("Boa tarde, Ana.");
    expect(getGreeting(null, "Ana", 20)).toBe("Boa noite, Ana.");
  });

  it("sem nome, fica só o cumprimento", () => {
    expect(getGreeting(null, null, 9)).toBe("Bom dia.");
  });
});
