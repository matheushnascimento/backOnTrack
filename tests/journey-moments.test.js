// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import {
  MOMENT_LEVEL_UP,
  MOMENT_REGRESSION,
  levelUpCopy,
  pendingMoment,
  achievedHabit,
  regressionCopy,
} from "@/constants/journeyMoments";

// Momentos da jornada (#293). Duas coisas com risco de bug aqui: um momento
// aparecer mais de uma vez (ou nunca), e a copy escorregar pro vocabulário
// que o projeto rejeita — culpa na regressão, jogo na subida.

describe("pendingMoment", () => {
  it("nível acima do reconhecido = subiu", () => {
    expect(pendingMoment(2, 1)).toBe(MOMENT_LEVEL_UP);
  });

  it("nível abaixo do reconhecido = regrediu", () => {
    expect(pendingMoment(1, 3)).toBe(MOMENT_REGRESSION);
  });

  // O que faz o momento aparecer UMA vez: reconhecer iguala os dois.
  it("nível igual ao reconhecido = nada pendente", () => {
    expect(pendingMoment(2, 2)).toBeNull();
  });

  // Comemorar a instalação seria comemorar o nada.
  it("primeira abertura não dispara momento", () => {
    expect(pendingMoment(1, -1)).toBeNull();
    expect(pendingMoment(3, -1)).toBeNull();
  });

  it("ack ausente é tratado como primeira abertura", () => {
    expect(pendingMoment(2, undefined)).toBeNull();
    expect(pendingMoment(2, null)).toBeNull();
  });

  it("nível inválido não dispara nada", () => {
    expect(pendingMoment(undefined, 1)).toBeNull();
  });

  // Reconhecer o lvl 0 é diferente de nunca ter reconhecido nada — por isso o
  // default é -1 e não 0.
  it("reconhecer o lvl 0 e subir dispara momento", () => {
    expect(pendingMoment(1, 0)).toBe(MOMENT_LEVEL_UP);
  });
});

describe("achievedHabit", () => {
  const ordem = ["sleep", "water", "feeding"];

  // No lvl 1 o primeiro hábito está sendo CONSTRUÍDO, não conquistado. Sem
  // esta guarda o sheet diria "Sono virou seu" tendo Sono como próximo foco.
  it("abaixo do lvl 2 nada foi conquistado", () => {
    expect(achievedHabit(0, ordem)).toBeNull();
    expect(achievedHabit(1, ordem)).toBeNull();
  });

  it("no lvl 2 o primeiro hábito virou seu", () => {
    expect(achievedHabit(2, ordem)).toBe("sleep");
  });

  it("no lvl 3 é o segundo", () => {
    expect(achievedHabit(3, ordem)).toBe("water");
  });

  it("além da ordem não inventa hábito", () => {
    expect(achievedHabit(99, ordem)).toBeNull();
  });
});

describe("levelUpCopy", () => {
  const c = levelUpCopy({ from: 1, to: 2, achieved: "sleep", next: "water" });

  it("mostra a transição de nível", () => {
    expect(c.steps).toBe("lvl 1 → lvl 2");
  });

  // Reconhecimento em prosa, não celebração.
  it("nomeia o que virou seu", () => {
    expect(c.title).toBe("Sono virou seu.");
  });

  it("aponta o próximo foco", () => {
    expect(c.nextName).toBe("Água");
    expect(c.confirm).toBe("Começar com água");
  });

  // O movimento mais importante da tela: a queda já vem anunciada, e leve.
  it("antecipa a queda sem peso", () => {
    expect(c.reassurance).toMatch(/sem drama/);
    expect(c.reassurance).toMatch(/continua na tela/);
  });

  it("sem próximo hábito, não inventa um", () => {
    const fim = levelUpCopy({ from: 4, to: 5, achieved: "study", next: null });
    expect(fim.nextName).toBeNull();
    expect(fim.confirm).toBe("Continuar");
  });

  // A trava do tom: nada de vocabulário de jogo (§1.5 e o "o que ficou fora"
  // escrito pelo próprio designer).
  it("não usa vocabulário de jogo nem celebração", () => {
    const tudo = Object.values(c).filter(Boolean).join(" ");
    expect(tudo).not.toMatch(
      /parab|desbloque|conquist|missão|troféu|medalha|🎉|🏆|XP|pontos/i,
    );
  });
});

describe("regressionCopy", () => {
  const c = regressionCopy({ focus: "water", paused: ["feeding"] });

  // Primeira pessoa do plural: o app voltou junto, não é a pessoa que falhou.
  it("o título é coletivo", () => {
    expect(c.title).toBe("voltamos pra água");
  });

  it("nomeia o que ficou em branco e promete o retorno", () => {
    expect(c.body).toMatch(/alimentação/i);
    expect(c.body).toMatch(/retoma/);
  });

  // A dúvida que a regressão levanta, respondida em voz alta — e com um botão
  // pro histórico, pra provar em vez de afirmar.
  it("diz que nada foi perdido e oferece o histórico", () => {
    expect(c.preserved).toMatch(/nada.*foi perdido/i);
    expect(c.history).toBe("Ver histórico");
  });

  // A trava mais importante do projeto: zero culpa.
  it("não usa nenhuma palavra de culpa ou falha", () => {
    const tudo = Object.values(c).join(" ");
    expect(tudo).not.toMatch(
      /falh|perdeu|errou|quebrou|fracass|desistiu|preguiç|culpa/i,
    );
  });

  // "em pausa", nunca "perdido" — e o texto não pode contradizer o badge.
  it("não chama o hábito de perdido", () => {
    expect(c.body).not.toMatch(/perdid/i);
  });

  it("lista mais de um hábito pausado", () => {
    const dois = regressionCopy({
      focus: "sleep",
      paused: ["water", "feeding"],
    });
    expect(dois.body).toMatch(/água/i);
    expect(dois.body).toMatch(/alimentação/i);
    expect(dois.body).toMatch(/ficaram/);
  });

  it("sem pausados nomeados, não quebra", () => {
    const vazio = regressionCopy({ focus: "water", paused: [] });
    expect(vazio.title).toBe("voltamos pra água");
    expect(vazio.body).toMatch(/ficou/);
  });
});
