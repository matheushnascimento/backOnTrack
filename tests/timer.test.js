// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Timer de exercício e estudo (#369).

import {
  elapsedMs,
  forgottenTimer,
  formatElapsed,
  timerStateFor,
  timerStopFields,
} from "@/constants/timer";
import { MAX_SPAN_MIN, reconcileTimes } from "@/constants/timeSpan";

const em = (d, h, m = 0, s = 0) => new Date(2026, 9, d, h, m, s).getTime();

describe("elapsedMs", () => {
  it("é agora menos o início, e sobrevive a fechar o app por construção", () => {
    expect(elapsedMs(em(23, 10), em(23, 10, 1, 30))).toBe(90_000);
  });

  it("relógio do aparelho voltando não dá tempo negativo", () => {
    expect(elapsedMs(em(23, 10), em(23, 9))).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("abaixo de uma hora, minutos e segundos", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(725_000)).toBe("12:05");
  });

  it("a partir de uma hora, com as horas", () => {
    expect(formatElapsed(3_725_000)).toBe("1:02:05");
  });
});

describe("timerStopFields", () => {
  it("parar escreve início e fim de relógio", () => {
    expect(timerStopFields(em(23, 18, 30, 50), em(23, 19, 31, 10))).toEqual({
      start: "18:30",
      end: "19:31",
    });
  });

  it("o reconcileTimes deriva a duração dos dois", () => {
    // O timer é só mais um jeito de digitar dois dos três campos da fatia 1.
    const campos = timerStopFields(em(23, 18, 30), em(23, 19, 15));
    expect(reconcileTimes(campos).duration).toBe("0:45");
  });

  it("atravessar a meia-noite funciona como na fatia 1", () => {
    const campos = timerStopFields(em(23, 23, 40), em(24, 0, 25));
    expect(campos).toEqual({ start: "23:40", end: "00:25" });
    expect(reconcileTimes(campos).duration).toBe("0:45");
  });

  it("menos de um minuto vira duração zero, que não salva", () => {
    const campos = timerStopFields(em(23, 10, 0, 5), em(23, 10, 0, 50));
    expect(reconcileTimes(campos).duration).toBe("0:00");
  });
});

describe("forgottenTimer", () => {
  it("passou do teto da métrica: esquecido", () => {
    // Estudo começou e a pessoa foi dormir.
    const teto = MAX_SPAN_MIN.study;
    expect(
      forgottenTimer({
        metric: "study",
        startedAt: em(23, 10),
        now: em(23, 10) + (teto + 1) * 60_000,
      }),
    ).toBe(true);
  });

  it("dentro do teto: normal", () => {
    expect(
      forgottenTimer({
        metric: "exercise",
        startedAt: em(23, 18),
        now: em(23, 19),
      }),
    ).toBe(false);
  });

  it("métrica sem teto nunca acusa", () => {
    expect(
      forgottenTimer({ metric: "water", startedAt: 0, now: em(23, 10) }),
    ).toBe(false);
  });
});

describe("timerStateFor", () => {
  const rodando = { metric: "exercise", startedAt: em(23, 18) };

  it("sem timer: parado", () => {
    expect(timerStateFor({ running: null, metric: "study" })).toBe("parado");
    expect(
      timerStateFor({ running: { metric: "", startedAt: 0 }, metric: "study" }),
    ).toBe("parado");
  });

  it("timer desta métrica: rodando", () => {
    expect(timerStateFor({ running: rodando, metric: "exercise" })).toBe(
      "rodando",
    );
  });

  it("timer de outra métrica: avisa em vez de começar um segundo", () => {
    expect(timerStateFor({ running: rodando, metric: "study" })).toBe("outro");
  });
});
