// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Código de login do e-mail (#376).

import { codigoCompleto, limparCodigo, OTP_MAX } from "@/constants/otp";

describe("limparCodigo", () => {
  it("aceita o código colado do e-mail com espaço e quebra de linha", () => {
    expect(limparCodigo(" 123 456\n")).toBe("123456");
  });

  it("descarta o que não é dígito", () => {
    expect(limparCodigo("12a-34b56")).toBe("123456");
  });

  it(`corta em ${OTP_MAX} dígitos`, () => {
    expect(limparCodigo("123456789012")).toBe("1234567890");
  });

  it("vazio e nulo viram vazio", () => {
    expect(limparCodigo("")).toBe("");
    expect(limparCodigo(undefined)).toBe("");
  });
});

describe("codigoCompleto", () => {
  it("6 dígitos já é um código", () => {
    expect(codigoCompleto("123456")).toBe(true);
  });

  it("aceita códigos mais longos, se o Supabase estiver configurado assim", () => {
    expect(codigoCompleto("12345678")).toBe(true);
  });

  it("menos de 6 ainda não", () => {
    expect(codigoCompleto("12345")).toBe(false);
    expect(codigoCompleto("")).toBe(false);
  });
});
