// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Peso corporal (#423): sugere a meta da água, e só viaja cifrado.

import {
  aguaPeloPeso,
  cifrarPeso,
  lerPeso,
  parsePeso,
  pesoNoCampo,
} from "@/constants/bodyWeight";
import { createKeyBundle } from "@/constants/e2e";
import { setBodyWeight, store } from "@/infra/database";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };

let chave, chaves;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

describe("parsePeso", () => {
  it("kg com até uma casa, vírgula ou ponto", () => {
    expect(parsePeso("72")).toBe(72);
    expect(parsePeso("72,5")).toBe(72.5);
    expect(parsePeso("72.5")).toBe(72.5);
  });

  it("recusa o que só pode ser engano", () => {
    expect(parsePeso("72,55")).toBeNull();
    expect(parsePeso("29")).toBeNull();
    expect(parsePeso("251")).toBeNull();
    expect(parsePeso("")).toBeNull();
    expect(parsePeso("setenta")).toBeNull();
  });

  it("o campo devolve o que o parse lê", () => {
    expect(pesoNoCampo(72.5)).toBe("72,5");
    expect(parsePeso(pesoNoCampo(72.5))).toBe(72.5);
    expect(pesoNoCampo(null)).toBe("");
  });
});

describe("aguaPeloPeso", () => {
  it("35 ml por kg, arredondado pra 100 ml", () => {
    expect(aguaPeloPeso(60)).toBe(2100);
    expect(aguaPeloPeso(70)).toBe(2500); // 2450
    expect(aguaPeloPeso(82.3)).toBe(2900); // 2880,5
  });

  it("fica dentro dos limites da meta", () => {
    expect(aguaPeloPeso(200)).toBe(5000);
    expect(aguaPeloPeso(30)).toBe(1100);
  });
});

describe("cifra", () => {
  it("o valor guardado não mostra o peso, e abre com a chave", () => {
    const protegido = cifrarPeso(chave, 72.5);
    expect(protegido).not.toContain("72");
    expect(lerPeso(chaves, protegido)).toEqual({ estado: "aberto", kg: 72.5 });
  });

  it("sem a chave, fica travado", () => {
    expect(lerPeso({}, cifrarPeso(chave, 72.5)).estado).toBe("travado");
  });

  it("vazio é peso não informado", () => {
    expect(lerPeso(chaves, "")).toEqual({ estado: "vazio" });
  });

  it("valor corrompido não vira peso", () => {
    expect(lerPeso(chaves, "e2e1:lixo").estado).not.toBe("aberto");
  });

  it("vai num valor sincronizado da store", () => {
    store.delValues();
    setBodyWeight(cifrarPeso(chave, 80));
    expect(lerPeso(chaves, store.getValue("bodyWeight"))).toEqual({
      estado: "aberto",
      kg: 80,
    });
  });
});
