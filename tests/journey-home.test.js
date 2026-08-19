// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import {
  METRIC_TINT,
  QUICK_ADD,
  hasQuickAdd,
  headerCopy,
  levelChip,
  quickAddLabel,
  restBadge,
  splitZones,
} from "@/constants/journeyHome";
import { JOURNEY_ORDER } from "@/constants/goals";
import { BUILDING, GRADUATED, LOCKED, PAUSED } from "@/constants/journey";

// Partes puras da Home da jornada (#291). O que se verifica aqui é o que tem
// risco de bug: qual ação rápida aparece, qual copy sai, e, o mais
// importante, que NADA some da tela.

const jornada = ({
  level = 2,
  focus = "water",
  regressed = false,
  statuses = {},
}) => ({
  level,
  focus,
  regressed,
  habits: Object.fromEntries(
    JOURNEY_ORDER.map((m) => [m, { status: statuses[m] ?? LOCKED }]),
  ),
});

describe("QUICK_ADD / hasQuickAdd", () => {
  it("água tem incrementos", () => {
    expect(hasQuickAdd("water")).toBe(true);
    expect(QUICK_ADD.water).toContain(500);
  });

  // O caso que forçou a decisão: sono é o PRIMEIRO foco da jornada e é
  // justamente o que não tem incremento sensato. Card cai no botão único.
  it("sono NÃO tem incremento", () => {
    expect(hasQuickAdd("sleep")).toBe(false);
  });

  it("toda métrica da jornada tem entrada definida", () => {
    for (const m of JOURNEY_ORDER) {
      expect(QUICK_ADD[m]).toBeDefined();
    }
  });
});

describe("quickAddLabel", () => {
  it("água em ml", () => {
    expect(quickAddLabel("water", 300)).toBe("+300ml");
  });

  it("minutos com espaço, pra ler como texto", () => {
    expect(quickAddLabel("exercise", 30)).toBe("+30 min");
    expect(quickAddLabel("study", 15)).toBe("+15 min");
  });

  it("refeição no singular", () => {
    expect(quickAddLabel("feeding", 1)).toBe("+1 refeição");
  });
});

describe("levelChip", () => {
  it("mostra nível e hábito do foco", () => {
    expect(levelChip(2, "water")).toBe("lvl 2 · água");
  });

  it("sem foco, só o nível", () => {
    expect(levelChip(0, null)).toBe("lvl 0");
  });
});

describe("headerCopy", () => {
  it("lvl 0 convida em vez de mostrar vazio", () => {
    const c = headerCopy(jornada({ level: 0, focus: null }));
    expect(c.title).toBe("Só registrar hoje.");
    expect(c.subtitle).toMatch(/qualquer coisa/i);
  });

  it("nomeia o hábito em construção", () => {
    const c = headerCopy(jornada({ focus: "water" }));
    expect(c.title).toBe("Construindo hoje: água.");
  });

  // Reforço sóbrio: reconhece sem premiar (§1.5 do modelo).
  it("reconhece o hábito já estável", () => {
    const c = headerCopy(
      jornada({ focus: "water", statuses: { sleep: GRADUATED } }),
    );
    expect(c.subtitle).toBe("Sono já é seu.");
  });

  it("lista mais de um hábito estável", () => {
    const c = headerCopy(
      jornada({
        focus: "feeding",
        statuses: { sleep: GRADUATED, water: GRADUATED },
      }),
    );
    expect(c.subtitle).toMatch(/sono, água|sono e água/i);
    expect(c.subtitle).toMatch(/já são seus/);
  });

  it("sem nada estável ainda, não inventa reconhecimento", () => {
    const c = headerCopy(jornada({ focus: "sleep" }));
    expect(c.subtitle).toBe("Sem pressa. Um de cada vez.");
  });

  // Zero culpa, zero vermelho, e o esforço de volta dimensionado como curto.
  it("na regressão, a copy é de recomeço e não de falha", () => {
    const c = headerCopy(jornada({ focus: "water", regressed: true }));
    expect(c.title).toBe("Recomeço curto.");
    expect(c.subtitle).toMatch(/volta pro foco/);
    expect(c.title + c.subtitle).not.toMatch(/falh|perd|errou|quebrou/i);
  });
});

describe("splitZones", () => {
  // A decisão central do design: hierarquia, não exclusão.
  it("NADA some: todas as métricas aparecem em alguma zona", () => {
    const { focus, rest } = splitZones(jornada({ focus: "water" }));
    expect([focus, ...rest].sort()).toEqual([...JOURNEY_ORDER].sort());
  });

  it("o foco não se repete no resto", () => {
    const { focus, rest } = splitZones(jornada({ focus: "water" }));
    expect(rest).not.toContain(focus);
  });

  // Sem foco (lvl 0), tudo vai pro resto, e nenhuma métrica é escondida.
  it("sem foco, todas ficam no resto", () => {
    const { focus, rest } = splitZones(jornada({ level: 0, focus: null }));
    expect(focus).toBeNull();
    expect(rest).toEqual(JOURNEY_ORDER);
  });

  it("métrica trancada continua na lista", () => {
    const { rest } = splitZones(
      jornada({ focus: "sleep", statuses: { study: LOCKED } }),
    );
    expect(rest).toContain("study");
  });
});

describe("restBadge", () => {
  it("estável para graduado", () => {
    expect(restBadge(GRADUATED)).toBe("estável");
  });

  // "em pausa", nunca "perdido", porque a palavra importa (tela 4a·2).
  it("em pausa para pausado", () => {
    expect(restBadge(PAUSED)).toBe("em pausa");
  });

  it("silêncio quando não há o que dizer", () => {
    expect(restBadge(BUILDING)).toBeNull();
    expect(restBadge(LOCKED)).toBeNull();
  });
});

describe("METRIC_TINT", () => {
  it("toda métrica tem tint, claro e escuro", () => {
    for (const m of JOURNEY_ORDER) {
      expect(METRIC_TINT[m]).toBeDefined();
      expect(METRIC_TINT[m]).toMatch(/dark:/);
    }
  });
});
