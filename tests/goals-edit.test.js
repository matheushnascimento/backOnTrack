// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Metas editáveis (#423): o que a pessoa digita, o que a store aceita, e a
// meta nova julgando a janela inteira.

import {
  EDITABLE_GOALS,
  GOAL_LIMITS,
  goalFor,
  goalInputValue,
  goalLimitsHint,
  parseGoalInput,
} from "@/constants/goals";
import { dailyVerdicts } from "@/constants/habitSignals";
import { ensureGoals, getGoals, setGoal, store } from "@/infra/database";

beforeEach(() => {
  store.delTables();
  ensureGoals();
});

describe("quais metas são editáveis", () => {
  it("as quatro somáveis, sem o sono", () => {
    expect(EDITABLE_GOALS).toEqual(["water", "feeding", "exercise", "study"]);
  });

  it("toda editável tem limites", () => {
    for (const m of EDITABLE_GOALS) expect(GOAL_LIMITS[m]).toBeDefined();
  });
});

describe("parseGoalInput", () => {
  it("água em litros, com vírgula ou ponto", () => {
    expect(parseGoalInput("water", "1,5")).toBe(1500);
    expect(parseGoalInput("water", "1.5")).toBe(1500);
    expect(parseGoalInput("water", "2")).toBe(2000);
    expect(parseGoalInput("water", " 3,2 ")).toBe(3200);
  });

  it("água com mais precisão do que a tela mostra é recusada", () => {
    // 1,25 L apareceria como 1,3 L no formatGoal.
    expect(parseGoalInput("water", "1,25")).toBeNull();
  });

  it("fora dos limites é recusado", () => {
    expect(parseGoalInput("water", "0,4")).toBeNull();
    expect(parseGoalInput("water", "5,1")).toBeNull();
    expect(parseGoalInput("feeding", "0")).toBeNull();
    expect(parseGoalInput("feeding", "9")).toBeNull();
    expect(parseGoalInput("exercise", "4")).toBeNull();
    expect(parseGoalInput("study", "481")).toBeNull();
  });

  it("inteiros nas demais, sem fração", () => {
    expect(parseGoalInput("feeding", "4")).toBe(4);
    expect(parseGoalInput("exercise", "45")).toBe(45);
    expect(parseGoalInput("exercise", "2,5")).toBeNull();
  });

  it("texto que não é número", () => {
    expect(parseGoalInput("water", "")).toBeNull();
    expect(parseGoalInput("water", "abc")).toBeNull();
    expect(parseGoalInput("water", "-1")).toBeNull();
    expect(parseGoalInput("sleep", "480")).toBeNull();
  });
});

describe("goalInputValue", () => {
  it("devolve o que o campo espera, e o parse fecha o ciclo", () => {
    expect(goalInputValue("water", 2000)).toBe("2");
    expect(goalInputValue("water", 1500)).toBe("1,5");
    expect(goalInputValue("exercise", 30)).toBe("30");
    for (const m of EDITABLE_GOALS) {
      const atual = goalFor({}, m);
      expect(parseGoalInput(m, goalInputValue(m, atual))).toBe(atual);
    }
  });

  it("dica com os limites na unidade de leitura", () => {
    expect(goalLimitsHint("water")).toBe("Entre 0,5 L e 5,0 L.");
    expect(goalLimitsHint("feeding")).toBe("Entre 1 refeição e 8 refeições.");
  });
});

describe("setGoal", () => {
  it("grava a meta válida", () => {
    expect(setGoal("water", 1500)).toBe(true);
    expect(getGoals().water).toBe(1500);
  });

  it("recusa o sono, fora dos limites e fora do passo", () => {
    expect(setGoal("sleep", 420)).toBe(false);
    expect(setGoal("water", 100)).toBe(false);
    expect(setGoal("water", 1550)).toBe(false);
    expect(setGoal("feeding", 2.5)).toBe(false);
    expect(getGoals()).toEqual({
      water: 2000,
      sleep: 480,
      exercise: 30,
      feeding: 3,
      study: 30,
    });
  });

  it("o seed não desfaz a meta escolhida", () => {
    setGoal("study", 60);
    ensureGoals();
    expect(getGoals().study).toBe(60);
  });
});

describe("a meta nova julga a janela inteira", () => {
  const AGORA = new Date(2026, 10, 10, 20).getTime();
  const ontem = new Date(2026, 10, 9, 10);
  const registros = [
    {
      type: "water",
      date: ontem.toISOString(),
      quantity: 1200,
      createdAt: ontem.getTime(),
    },
  ];
  const diaDeOntem = (meta) =>
    dailyVerdicts(registros, "water", meta, 7, AGORA).find((v) => v.total > 0);

  it("1,2 L ontem não bate 2 L, e bate 1 L depois de editar", () => {
    expect(diaDeOntem(goalFor(getGoals(), "water")).hit).toBe(false);
    setGoal("water", 1000);
    expect(diaDeOntem(goalFor(getGoals(), "water")).hit).toBe(true);
  });
});
