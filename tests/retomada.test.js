// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Retomada absorvendo a jornada (#320).
//
// O que se trava aqui é a razão de a mudança existir: a retomada apontava pra
// água enquanto a jornada punha todo mundo em sono, e ela escondia a queda de
// nível de quem tinha acabado de cair.

import {
  retomadaRegressionLine,
  retomadaShortcuts,
} from "../constants/retomada";

describe("retomadaShortcuts", () => {
  it("põe o hábito em foco na frente", () => {
    expect(retomadaShortcuts("sleep")[0]).toEqual({
      metric: "sleep",
      label: "Como foi a última noite",
    });
  });

  it("acompanha o foco quando ele muda de nível", () => {
    expect(retomadaShortcuts("feeding")[0].metric).toBe("feeding");
    expect(retomadaShortcuts("study")[0].metric).toBe("study");
  });

  it("nunca repete o foco no segundo atalho", () => {
    for (const foco of ["sleep", "water", "feeding", "exercise", "study"]) {
      const [primeiro, segundo] = retomadaShortcuts(foco);
      expect(primeiro.metric).toBe(foco);
      expect(segundo.metric).not.toBe(foco);
    }
  });

  it("sem foco, mantém o par original da tela", () => {
    // lvl 0, ou jornada indisponível: o comportamento do M5-B continua.
    expect(retomadaShortcuts(null).map((a) => a.metric)).toEqual([
      "water",
      "sleep",
    ]);
    expect(retomadaShortcuts(undefined).map((a) => a.metric)).toEqual([
      "water",
      "sleep",
    ]);
  });

  it("devolve sempre dois atalhos de métrica", () => {
    expect(retomadaShortcuts("sleep")).toHaveLength(2);
    expect(retomadaShortcuts(null)).toHaveLength(2);
  });

  it("todo atalho tem rótulo de convite, nunca vazio", () => {
    for (const foco of ["sleep", "water", "feeding", "exercise", "study"]) {
      for (const a of retomadaShortcuts(foco)) {
        expect(a.label.length).toBeGreaterThan(3);
      }
    }
  });
});

describe("retomadaRegressionLine", () => {
  it("diz o que mudou e que nada sumiu", () => {
    const linha = retomadaRegressionLine("sleep");
    expect(linha).toMatch(/sono/);
    expect(linha).toMatch(/nada do que você registrou se perdeu/);
  });

  it("não inventa linha sem foco", () => {
    expect(retomadaRegressionLine(null)).toBeNull();
    expect(retomadaRegressionLine(undefined)).toBeNull();
  });

  it("evita palavra de culpa", () => {
    // Mesmo contrato do RegressionNotice: sem "falhou", "perdeu" solto, ou
    // "você deixou". A queda é dita como fato, não como acusação.
    for (const foco of ["sleep", "water", "feeding", "exercise", "study"]) {
      const linha = retomadaRegressionLine(foco);
      expect(linha).not.toMatch(/falh|culpa|deixou de|desistiu/i);
    }
  });
});
