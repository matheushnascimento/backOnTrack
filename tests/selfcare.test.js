// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Autocuidado (#374, fatia 3a): o que vai cifrado e como é lido de volta.

import { createKeyBundle } from "@/constants/e2e";
import {
  SELFCARE_TIPOS,
  cifrarRegistro,
  lerRegistro,
  rotuloDoTipo,
} from "@/constants/selfcare";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };

let chave, chaves, outra;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  const b = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  outra = { kid: b.bundle.kid, dataKey: b.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

describe("cifrarRegistro", () => {
  it("o tipo e a nota não aparecem no campo", () => {
    const protegido = cifrarRegistro(chave, {
      tipo: "remedio",
      nota: "sertralina 50mg",
    });
    expect(protegido).not.toMatch(/remedio|sertralina|50mg/);
  });

  it("tipo desconhecido é recusado antes de cifrar", () => {
    expect(() => cifrarRegistro(chave, { tipo: "academia" })).toThrow();
  });
});

describe("lerRegistro", () => {
  it("com a chave, devolve tipo e nota", () => {
    const protegido = cifrarRegistro(chave, {
      tipo: "terapia",
      nota: "  sessão boa  ",
    });
    expect(lerRegistro(chaves, { protegido })).toEqual({
      estado: "aberto",
      tipo: "terapia",
      nota: "sessão boa",
    });
  });

  it("lê também a linha crua do useTable, com o campo no details", () => {
    // O formato que pegou o #356: testar só o hidratado passa e quebra no app.
    const protegido = cifrarRegistro(chave, { tipo: "remedio" });
    const crua = { type: "selfcare", details: JSON.stringify({ protegido }) };
    expect(lerRegistro(chaves, crua)).toMatchObject({
      estado: "aberto",
      tipo: "remedio",
    });
  });

  it("sem a chave destrancada: travado, e não ilegível", () => {
    // O certo aqui é pedir a senha, e não acusar dado corrompido.
    const protegido = cifrarRegistro(outra, { tipo: "remedio" });
    expect(lerRegistro(chaves, { protegido })).toEqual({ estado: "travado" });
    expect(lerRegistro({}, { protegido })).toEqual({ estado: "travado" });
  });

  it("adulterado: ilegível", () => {
    const protegido = cifrarRegistro(chave, { tipo: "remedio" });
    const i = protegido.length - 4;
    const ruim =
      protegido.slice(0, i) +
      (protegido[i] === "A" ? "B" : "A") +
      protegido.slice(i + 1);
    expect(lerRegistro(chaves, { protegido: ruim })).toEqual({
      estado: "ilegivel",
    });
  });

  it("registro sem o campo: ilegível", () => {
    expect(lerRegistro(chaves, { type: "selfcare" })).toEqual({
      estado: "ilegivel",
    });
  });
});

describe("rotuloDoTipo", () => {
  it("os quatro tipos têm rótulo", () => {
    expect(SELFCARE_TIPOS.map((t) => rotuloDoTipo(t.key))).toEqual([
      "remédio",
      "skincare",
      "terapia",
      "outro",
    ]);
  });
});
