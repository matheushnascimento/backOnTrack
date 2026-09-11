// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Faixa de suficiência (#340).
//
// A tela exibia "8h" cravado enquanto o próprio arquivo dizia num comentário
// que "8h pra todo mundo é mentira, porque tem gente que precisa de 7".

import { DEFAULT_GOALS, GOAL_RANGE, formatGoal } from "../constants/goals";

describe("formatGoal com faixa", () => {
  it("sono exibe a faixa, não o ponto", () => {
    expect(formatGoal("sleep", 480)).toBe("7h a 8h");
  });

  it("a faixa ignora o alvo guardado", () => {
    // Quem já usa o app tem 480 gravado, e o ensureGoals não sobrescreve.
    // Se a faixa dependesse do valor do store, essas pessoas continuariam
    // vendo 8h, que é justamente o caso que motivou a mudança.
    for (const guardado of [420, 480, 600, 0]) {
      expect(formatGoal("sleep", guardado)).toBe("7h a 8h");
    }
  });

  it("não recursa até estourar", () => {
    // O primeiro desenho chamava formatGoal dentro dele mesmo pra formatar as
    // pontas, e recaía na faixa sem fim. Travaria a tela de Ajustes.
    expect(() => formatGoal("sleep", 480)).not.toThrow();
  });
});

describe("métricas sem faixa seguem no ponto", () => {
  it("água, alimentação, exercício e estudo não mudam", () => {
    expect(formatGoal("water", 2000)).toBe("2,0 L");
    expect(formatGoal("feeding", 3)).toBe("3 refeições");
    expect(formatGoal("feeding", 1)).toBe("1 refeição");
    expect(formatGoal("exercise", 30)).toBe("30 min");
    expect(formatGoal("study", 30)).toBe("30 min");
  });

  it("alvo inválido continua devolvendo o glifo de vazio", () => {
    expect(formatGoal("water", 0)).toBe("—");
    expect(formatGoal("water", undefined)).toBe("—");
  });
});

describe("a faixa é coerente", () => {
  it("min menor que max, e o topo bate com o default guardado", () => {
    const [min, max] = GOAL_RANGE.sleep;
    expect(min).toBeLessThan(max);
    expect(max).toBe(DEFAULT_GOALS.sleep);
  });

  it("só o sono tem faixa por ora", () => {
    // Guarda contra a faixa virar depósito: cada métrica que entrar aqui
    // precisa de uma razão, e o sono tem a literatura de 7 a 8 horas.
    expect(Object.keys(GOAL_RANGE)).toEqual(["sleep"]);
  });
});
