// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Corrigir a hora de um registro (#336).
//
// O caso: quatro refeições lançadas às 22h. Corrigir só o rótulo deixava as
// quatro no mesmo minuto, e a regularidade lia isso como dispersão zero.

import { timeOf, withTimeOfDay } from "../constants/recordTime";

const em = (h, min = 0) => new Date(2026, 8, 11, h, min, 30, 500).getTime();

describe("timeOf", () => {
  it("formata com dois dígitos", () => {
    expect(timeOf(em(9, 5))).toBe("09:05");
    expect(timeOf(em(22, 40))).toBe("22:40");
  });
});

describe("withTimeOfDay", () => {
  it("troca a hora mantendo o dia", () => {
    const novo = withTimeOfDay(em(22), "12:30");
    const d = new Date(novo);
    expect(d.getDate()).toBe(11);
    expect(d.getMonth()).toBe(8);
    expect(timeOf(novo)).toBe("12:30");
  });

  it("zera segundos e milissegundos", () => {
    // Sem isto, dois registros corrigidos pro mesmo horário continuariam
    // diferindo por resíduo invisível, e a dispersão da regularidade sairia
    // de um ruído que ninguém consegue ver nem editar.
    const d = new Date(withTimeOfDay(em(22), "12:30"));
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it("nunca atravessa a meia-noite", () => {
    // A restrição que evita a divergência entre getByDate (usa `date`) e
    // dailyVerdicts (usa `createdAt`): o registro apareceria num dia no
    // histórico e contaria em outro nos sinais.
    for (const hora of ["00:00", "23:59", "12:00"]) {
      const d = new Date(withTimeOfDay(em(22), hora));
      expect(d.getDate()).toBe(11);
    }
  });

  it("recusa hora ilegível sem gravar nada", () => {
    expect(withTimeOfDay(em(22), "")).toBeNull();
    expect(withTimeOfDay(em(22), "25:00")).toBeNull();
    expect(withTimeOfDay(em(22), "12:60")).toBeNull();
    expect(withTimeOfDay(em(22), "meio-dia")).toBeNull();
  });

  it("recusa instante inválido", () => {
    expect(withTimeOfDay(0, "12:30")).toBeNull();
    expect(withTimeOfDay(null, "12:30")).toBeNull();
  });
});
