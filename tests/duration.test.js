// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Conversão HH:MM ↔ minutos (M4, #140). Sustenta as métricas de tempo
// (sono/exercício/estudo): a UI edita em "HH:MM", a store guarda minutos.
import { hhmmToMinutes, minutesToHHMM } from "../constants/duration";

describe("hhmmToMinutes", () => {
  test.each([
    ["7:30", 450],
    ["0:00", 0],
    ["1:00", 60],
    ["10:5", 605],
    ["", 0],
  ])("'%s' → %i", (input, expected) => {
    expect(hhmmToMinutes(input)).toBe(expected);
  });

  test("número passa direto (sem parse de string)", () => {
    expect(hhmmToMinutes(450)).toBe(450);
  });

  test("lixo vira 0, sem quebrar", () => {
    expect(hhmmToMinutes("abc")).toBe(0);
  });
});

describe("minutesToHHMM", () => {
  test.each([
    [450, "7:30"],
    [0, "0:00"],
    [5, "0:05"], // minutos sempre com 2 dígitos
    [60, "1:00"],
    [125, "2:05"],
  ])("%i → '%s'", (input, expected) => {
    expect(minutesToHHMM(input)).toBe(expected);
  });

  test("não-numérico vira 0:00", () => {
    expect(minutesToHHMM("abc")).toBe("0:00");
  });
});

test("round-trip HH:MM → minutos → HH:MM preserva o valor", () => {
  for (const s of ["7:30", "0:05", "12:00", "1:59"]) {
    expect(minutesToHHMM(hhmmToMinutes(s))).toBe(s);
  }
});
