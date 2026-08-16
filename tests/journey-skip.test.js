// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import { skipCopy, skipEvidence, skipQualifies } from "@/constants/journeySkip";
import { THRESHOLDS } from "@/constants/journey";
import { deriveJourney, GRADUATED } from "@/constants/journey";

// Pular nível (#295). O risco maior aqui não é técnico: é a tela virar
// interrogatório, ou a concessão virar atalho que afrouxa o critério.

const sinais = ({ rate = 1, n = 28, sd = 10, doubleMisses = 0 }) => ({
  consistency: { rate, hits: Math.round(rate * 28), days: 28 },
  regularity: { resultant: 0.99, sdMinutes: sd, n },
  resilience: { rate: 1, recovered: 1, opportunities: 1, doubleMisses },
});

describe("skipQualifies", () => {
  it("histórico bom qualifica", () => {
    expect(skipQualifies(sinais({}), THRESHOLDS)).toBe(true);
  });

  // A trava contra "pular = atalho": a exigência é a MESMA do portão.
  it("histórico fraco não qualifica", () => {
    expect(skipQualifies(sinais({ rate: 0.3 }), THRESHOLDS)).toBe(false);
  });

  it("amostra pequena não qualifica, por mais concentrada que pareça", () => {
    expect(skipQualifies(sinais({ n: 2, sd: 1 }), THRESHOLDS)).toBe(false);
  });
});

describe("skipEvidence", () => {
  const linhas = skipEvidence(sinais({ rate: 0.75, n: 21, sd: 24 }), 28);

  it("mostra fatos observáveis, não notas", () => {
    expect(linhas.map((l) => l.value).join(" ")).toMatch(
      /21 \/ 28 dias|± 24 min/,
    );
  });

  // Dizer "0 min de variação" com dois registros seria inventar precisão.
  it("sem amostra, não inventa número", () => {
    const semSd = skipEvidence(sinais({ sd: null, n: 1 }), 28);
    expect(semSd.find((l) => l.label.match(/Variação/)).value).toBe("—");
  });

  it("nenhuma linha traz julgamento", () => {
    const texto = linhas.map((l) => `${l.label} ${l.value}`).join(" ");
    expect(texto).not.toMatch(/bom|ruim|ótimo|fraco|parab|falh/i);
  });
});

describe("skipCopy", () => {
  const ok = skipCopy({ metric: "sleep", qualifies: true, nextLevel: 2 });
  const nao = skipCopy({ metric: "sleep", qualifies: false, nextLevel: 2 });

  it("quando bate, concede e nomeia o nível", () => {
    expect(ok.verdict).toMatch(/lvl 2/);
    expect(ok.confirm).toBe("Começar no lvl 2");
  });

  // O movimento que impede a tela de virar interrogatório.
  it("quando bate, antecipa o caso oposto", () => {
    expect(ok.alternate).toMatch(/se não batesse/i);
    expect(ok.alternate).toMatch(/sem drama/);
  });

  it("quando não bate, diz o que vai fazer em vez de acusar", () => {
    expect(nao.verdict).toMatch(/ainda não mostra/);
    expect(nao.alternate).toMatch(/nada foi descartado/i);
  });

  // A trava mais importante: o app não pode chamar a pessoa de mentirosa.
  it("nunca acusa a pessoa, em nenhum desfecho", () => {
    for (const c of [ok, nao]) {
      const tudo = Object.values(c).join(" ");
      expect(tudo).not.toMatch(
        /mentiu|mentira|falso|não acredit|desconfi|prove|comprove/i,
      );
    }
  });

  it("não usa vocabulário de jogo", () => {
    const tudo = Object.values(ok).join(" ");
    expect(tudo).not.toMatch(/desbloque|conquist|parab|troféu|🎉/i);
  });
});

describe("concessão no deriveJourney", () => {
  const base = {
    records: [],
    goals: {},
    now: Date.now(),
    thresholds: THRESHOLDS,
  };

  it("hábito concedido entra graduado sem histórico", () => {
    const j = deriveJourney({ ...base, granted: ["sleep"] });
    expect(j.habits.sleep.status).toBe(GRADUATED);
    expect(j.habits.sleep.granted).toBe(true);
  });

  it("concessão sobe o nível", () => {
    const semGrant = deriveJourney({ ...base, granted: [] });
    const comGrant = deriveJourney({ ...base, granted: ["sleep"] });
    expect(comGrant.level).toBeGreaterThan(semGrant.level);
  });

  // Graduado não derruba ninguém — e concedido é graduado.
  it("hábito concedido não é reportado como quebrado", () => {
    const j = deriveJourney({ ...base, granted: ["sleep"] });
    expect(j.habits.sleep.broken).toBe(false);
  });

  it("sem concessão, nada muda", () => {
    const j = deriveJourney({ ...base });
    expect(j.habits.sleep.granted).toBe(false);
  });
});
