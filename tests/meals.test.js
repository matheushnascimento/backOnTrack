// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Qual refeição é cada registro (#332).
//
// O caso que motivou a mudança: três refeições lançadas às 22h viravam três
// jantares, e não havia o que corrigir porque o rótulo nunca era gravado.

import { MEALS, isMealChosen, mealFromHour, mealOf } from "../constants/meals";

const reg = (createdAt, meal) => ({ createdAt, ...(meal ? { meal } : {}) });
const as = (h) => new Date(2026, 8, 11, h, 0, 0).getTime();

describe("mealFromHour", () => {
  it("cobre as quatro faixas do dia", () => {
    expect(mealFromHour(8)).toBe("café");
    expect(mealFromHour(13)).toBe("almoço");
    expect(mealFromHour(16)).toBe("lanche");
    expect(mealFromHour(21)).toBe("jantar");
  });

  it("cai na primeira quando a hora não é número", () => {
    expect(mealFromHour(undefined)).toBe("café");
    expect(mealFromHour("tarde")).toBe("café");
  });
});

describe("mealOf", () => {
  it("a escolha manda sobre o horário", () => {
    // O ponto da mudança: lançado às 22h, mas era o café.
    expect(mealOf(reg(as(22), "café"))).toBe("café");
  });

  it("sem escolha, o horário sugere", () => {
    expect(mealOf(reg(as(13)))).toBe("almoço");
  });

  it("valor desconhecido cai na sugestão em vez de vazar pra tela", () => {
    // Protege contra dado vindo do sync de uma versão futura, e contra typo.
    expect(mealOf(reg(as(13), "brunch"))).toBe("almoço");
    expect(mealOf(reg(as(13), ""))).toBe("almoço");
  });

  it("tolera registro ausente", () => {
    expect(MEALS).toContain(mealOf(null));
    expect(MEALS).toContain(mealOf(undefined));
  });

  it("três lançados às 22h podem virar três refeições diferentes", () => {
    // O caso relatado, de ponta a ponta.
    const lote = [reg(as(22), "café"), reg(as(22), "almoço"), reg(as(22))];
    expect(lote.map(mealOf)).toEqual(["café", "almoço", "jantar"]);
  });
});

describe("isMealChosen", () => {
  it("distingue escolha de palpite", () => {
    // A tela usa isso pra não afirmar as duas coisas com a mesma confiança.
    expect(isMealChosen(reg(as(22), "café"))).toBe(true);
    expect(isMealChosen(reg(as(22)))).toBe(false);
    expect(isMealChosen(reg(as(22), "brunch"))).toBe(false);
  });
});
