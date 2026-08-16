// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import {
  stableChip,
  stableExplanation,
  stableForDays,
  stableRegisterLabel,
  stableStrip,
} from "@/constants/stableHabit";

// Tela do hábito estável (#297). O risco aqui é de TOM: a tela pode virar
// troféu com uma palavra trocada. E o "há N dias" pode mentir se a data não
// existir.

const DIA = 86_400_000;
const AGORA = new Date(2026, 7, 16, 12, 0, 0, 0).getTime();

describe("stableForDays", () => {
  it("conta os dias desde a data", () => {
    expect(stableForDays(AGORA - 24 * DIA, AGORA)).toBe(24);
  });

  it("mesmo dia é zero", () => {
    expect(stableForDays(AGORA - 1000, AGORA)).toBe(0);
  });

  // Sem data, a tela omite o "há N dias" em vez de dizer zero. Zero seria
  // afirmar que graduou hoje, o que pode ser falso.
  it("sem data não inventa contagem", () => {
    expect(stableForDays(undefined, AGORA)).toBeNull();
    expect(stableForDays(0, AGORA)).toBeNull();
    expect(stableForDays(null, AGORA)).toBeNull();
  });

  it("data no futuro não vira número negativo", () => {
    expect(stableForDays(AGORA + 10 * DIA, AGORA)).toBeNull();
  });
});

describe("stableChip", () => {
  it("mostra a contagem", () => {
    expect(stableChip(24)).toBe("estável há 24 dias");
  });

  it("singular no primeiro dia", () => {
    expect(stableChip(1)).toBe("estável há 1 dia");
  });

  it("hoje tem texto próprio", () => {
    expect(stableChip(0)).toBe("estável desde hoje");
  });

  it("sem contagem, só o status", () => {
    expect(stableChip(null)).toBe("estável");
  });

  // Status, não medalha — a palavra escolhida importa.
  it("não usa vocabulário de prêmio", () => {
    for (const d of [null, 0, 1, 24]) {
      expect(stableChip(d)).not.toMatch(
        /conquist|domin|mestre|parab|troféu|nível máximo/i,
      );
    }
  });
});

describe("stableExplanation", () => {
  const e = stableExplanation("sleep");

  // O benefício real vem PRIMEIRO. A versão anterior abria pelo negativo
  // ("não pode mais te fazer voltar") e soava fria: a primeira informação era
  // sobre uma punição que sumiu, não sobre o que a pessoa ganhou.
  it("abre pelo que mudou pra pessoa", () => {
    expect(e.body).toMatch(/não precisa mais do seu esforço ativo/);
  });

  // Sem um motivo, registrar vira permissão sem propósito — e a pessoa para.
  it("dá um motivo pra continuar registrando", () => {
    expect(e.body).toMatch(/manter os dados apurados/);
  });

  it("diz que o hábito não derruba mais o nível", () => {
    expect(e.body).toMatch(/não derruba mais o seu nível/);
  });

  // "medir você" transformava a pessoa em objeto do app. Preciso, e frio.
  it("não trata a pessoa como algo a ser medido", () => {
    expect(e.body).not.toMatch(/medir você/);
  });

  it("não vira elogio", () => {
    expect(e.body).not.toMatch(/parab|orgulho|incrível|excelente|domin/i);
  });
});

describe("stableStrip", () => {
  const verdicts = Array.from({ length: 28 }, (_, i) => ({
    dia: `2026-08-${String(i + 1).padStart(2, "0")}`,
    hit: i % 3 !== 0,
  }));

  it("corta nos últimos 14 dias", () => {
    expect(stableStrip(verdicts).days).toHaveLength(14);
  });

  it("a ponta direita é hoje", () => {
    expect(stableStrip(verdicts).to).toBe("hoje");
  });

  it("a ponta esquerda mostra a data de início", () => {
    expect(stableStrip(verdicts).from).toMatch(/^\d{2}\/\d{2}$/);
  });

  it("janela vazia não quebra", () => {
    const s = stableStrip([]);
    expect(s.days).toEqual([]);
    expect(s.to).toBe("");
  });

  it("preserva o veredito de cada dia", () => {
    const s = stableStrip(verdicts);
    expect(s.days.every((d) => typeof d.hit === "boolean")).toBe(true);
  });
});

describe("stableRegisterLabel", () => {
  it("nomeia a métrica", () => {
    expect(stableRegisterLabel("sleep")).toBe("Registrar sono de hoje");
  });
});
