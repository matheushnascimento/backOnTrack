// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import {
  BUILDING,
  GRADUATED,
  LOCKED,
  PAUSED,
  THRESHOLDS,
  deriveJourney,
  isBroken,
  passesGate,
  passesGraduation,
} from "@/constants/journey";
import { JOURNEY_ORDER } from "@/constants/goals";

// Estado da jornada (#289). Os testes usam dado SINTÉTICO de propósito: os
// limiares são provisórios e sem calibração, então o que se verifica aqui é o
// mecanismo (transições, ordem, semântica de pausa), e não os valores.

const DIA = 86_400_000;
// Base fixa: sem isso os testes dependem da hora em que a suíte roda (lição
// da #285, onde "hoje às 20:00" ficava no futuro antes das 20h).
const AGORA = new Date(2026, 7, 14, 23, 30, 0, 0).getTime();

/** Registro no dia N atrás, às 9h (horário estável de propósito). */
function reg(type, diasAtras, quantity, hora = 9) {
  const d = new Date(AGORA - diasAtras * DIA);
  d.setHours(hora, 0, 0, 0);
  return { type, createdAt: d.getTime(), quantity };
}

/** Série que bate a meta todo dia da janela, sempre no mesmo horário. */
function serieCheia(type, quantity, dias = 28, hora = 9) {
  return Array.from({ length: dias }, (_, i) => reg(type, i, quantity, hora));
}

/** Sinais sintéticos, pra testar os portões sem montar registros. */
function sinais({ rate = 1, n = 28, sd = 10, doubleMisses = 0, resRate = 1 }) {
  return {
    consistency: { rate, hits: Math.round(rate * 28), days: 28 },
    regularity: { resultant: 0.99, sdMinutes: sd, n },
    resilience: { rate: resRate, recovered: 1, opportunities: 1, doubleMisses },
  };
}

describe("passesGate", () => {
  it("passa com consistência alta, horário estável e amostra suficiente", () => {
    expect(passesGate(sinais({}))).toBe(true);
  });

  it("consistência abaixo do limiar não passa", () => {
    expect(passesGate(sinais({ rate: 0.5 }))).toBe(false);
  });

  // O achado da #285 virando trava: estudo marcou R=0,99 sobre 2 registros.
  // Sem piso de amostra o portão abriria pra quem registrou duas vezes.
  it("amostra pequena não passa, por mais concentrada que pareça", () => {
    expect(passesGate(sinais({ n: 2, sd: 1 }))).toBe(false);
  });

  it("horário disperso não passa", () => {
    expect(passesGate(sinais({ sd: 400 }))).toBe(false);
  });

  // Duas faltas seguidas é o laço quebrado (§6), e não "perto de automático".
  it("falta dupla na janela não passa", () => {
    expect(passesGate(sinais({ doubleMisses: 1 }))).toBe(false);
  });

  it("sem desvio calculável não passa", () => {
    const s = sinais({});
    s.regularity.sdMinutes = null;
    expect(passesGate(s)).toBe(false);
  });
});

describe("passesGraduation", () => {
  it("gradua com barra alta em tudo", () => {
    expect(passesGraduation(sinais({ rate: 0.95, n: 28, sd: 30 }))).toBe(true);
  });

  // A diferença entre "perto de automático" e "automático".
  it("passar o portão não basta pra graduar", () => {
    const apenasPortao = sinais({ rate: 0.82, n: 10, sd: 100 });
    expect(passesGate(apenasPortao)).toBe(true);
    expect(passesGraduation(apenasPortao)).toBe(false);
  });

  it("amostra insuficiente pra graduação não gradua", () => {
    expect(passesGraduation(sinais({ rate: 0.95, n: 10, sd: 30 }))).toBe(false);
  });

  // Nunca ter caído é ausência de queda, não ausência de resiliência.
  it("quem nunca falhou pode graduar", () => {
    const s = sinais({ rate: 0.95, n: 28, sd: 30 });
    s.resilience.rate = null;
    expect(passesGraduation(s)).toBe(true);
  });

  it("resiliência baixa impede graduação", () => {
    expect(
      passesGraduation(sinais({ rate: 0.95, n: 28, sd: 30, resRate: 0.2 })),
    ).toBe(false);
  });
});

describe("isBroken", () => {
  const v = (...hits) => hits.map((h) => ({ hit: h }));

  it("diário: duas faltas consecutivas quebram", () => {
    expect(isBroken(v(true, false, false, true), "daily")).toBe(true);
  });

  it("diário: faltas isoladas não quebram", () => {
    expect(isBroken(v(false, true, false, true, false), "daily")).toBe(false);
  });

  // O caso que a terceira regra existe pra evitar: rebaixar alguém por
  // descansar sábado e domingo.
  it("semanal: dois dias seguidos sem registro NÃO quebram", () => {
    const semana = [true, true, true, false, false, true, true];
    expect(
      isBroken(
        [...semana, ...semana].map((h) => ({ hit: h })),
        "weekly",
      ),
    ).toBe(false);
  });

  it("semanal: duas semanas seguidas abaixo do alvo quebram", () => {
    const fraca = [true, false, false, false, false, false, false];
    expect(
      isBroken(
        [...fraca, ...fraca].map((h) => ({ hit: h })),
        "weekly",
      ),
    ).toBe(true);
  });

  it("semanal: uma semana ruim sozinha não quebra", () => {
    const boa = [true, true, true, true, false, false, false];
    const fraca = [true, false, false, false, false, false, false];
    expect(
      isBroken(
        [...boa, ...fraca].map((h) => ({ hit: h })),
        "weekly",
      ),
    ).toBe(false);
  });

  it("janela curta demais pra duas semanas não quebra", () => {
    expect(isBroken(v(false, false, false), "weekly")).toBe(false);
  });
});

describe("deriveJourney", () => {
  const base = { goals: {}, now: AGORA, thresholds: THRESHOLDS };

  it("sem registro nenhum, o primeiro hábito está em construção", () => {
    const j = deriveJourney({ records: [], ...base });
    expect(j.level).toBe(1);
    expect(j.habits.sleep.status).toBe(BUILDING);
    expect(j.habits.water.status).toBe(LOCKED);
    expect(j.focus).toBe("sleep");
  });

  // Quem nunca começou não está quebrado. Sem isto, um usuário novo abriria o
  // app já "regredido": 28 dias de janela vazia viram 28 faltas.
  it("hábito sem nenhum acerto não é reportado como quebrado", () => {
    const j = deriveJourney({ records: [], ...base });
    expect(j.habits.sleep.broken).toBe(false);
    expect(j.regressed).toBe(false);
  });

  // Sono é `presence`: registrar todo dia no mesmo horário basta pra passar.
  it("sono consistente abre a água", () => {
    const j = deriveJourney({ records: serieCheia("sleep", 480), ...base });
    expect(j.level).toBe(2);
    expect(j.habits.water.status).toBe(BUILDING);
    expect(j.focus).toBe("water");
  });

  it("hábitos além do aberto ficam trancados", () => {
    const j = deriveJourney({ records: serieCheia("sleep", 480), ...base });
    expect(j.habits.feeding.status).toBe(LOCKED);
    expect(j.habits.exercise.status).toBe(LOCKED);
  });

  it("hábito na barra alta aparece como graduado", () => {
    const j = deriveJourney({ records: serieCheia("sleep", 480), ...base });
    expect(j.habits.sleep.status).toBe(GRADUATED);
  });

  // ⚠️ O ponto central da fatia: sem passado, não há regressão. Olhando só o
  // presente é impossível distinguir "caiu do lvl 3" de "nunca passou do 2".
  it("sem previousLevel não afirma regressão", () => {
    const j = deriveJourney({ records: [], ...base });
    expect(j.regressed).toBe(false);
  });

  it("nível abaixo do anterior é regressão", () => {
    const j = deriveJourney({ records: [], previousLevel: 3, ...base });
    expect(j.regressed).toBe(true);
    expect(j.level).toBe(1);
  });

  it("nível igual ou acima do anterior não é regressão", () => {
    const recs = serieCheia("sleep", 480);
    expect(
      deriveJourney({ records: recs, previousLevel: 2, ...base }).regressed,
    ).toBe(false);
    expect(
      deriveJourney({ records: recs, previousLevel: 1, ...base }).regressed,
    ).toBe(false);
  });

  // A decisão da #289: quem pausa é o TOPO, não quem quebrou.
  it("na regressão, pausa o topo, os hábitos entre o nível atual e o antigo", () => {
    const j = deriveJourney({
      records: serieCheia("sleep", 480),
      previousLevel: 4,
      ...base,
    });
    // passou o portão só no sono → level 2, vindo do 4
    expect(j.level).toBe(2);
    expect(j.habits.sleep.status).toBe(GRADUATED);
    expect(j.habits.water.status).toBe(BUILDING);
    // os dois do topo pausaram, não o sono nem a água
    expect(j.habits.feeding.status).toBe(PAUSED);
    expect(j.habits.exercise.status).toBe(PAUSED);
    expect(j.habits.study.status).toBe(LOCKED);
  });

  it("nível não passa da quantidade de hábitos", () => {
    const recs = JOURNEY_ORDER.flatMap((m) =>
      serieCheia(m, m === "feeding" ? 3 : 2500),
    );
    const j = deriveJourney({ records: recs, ...base });
    expect(j.level).toBeLessThanOrEqual(JOURNEY_ORDER.length);
  });

  it("devolve os sinais junto, pro diagnóstico mostrar o porquê", () => {
    const j = deriveJourney({ records: serieCheia("sleep", 480), ...base });
    expect(j.habits.sleep.signals.consistency.rate).toBe(1);
    expect(j.habits.sleep.signals.regularity.n).toBe(28);
  });
});
