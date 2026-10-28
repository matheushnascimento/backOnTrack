// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Higiene do sono em escada (#396, fatia 1).
//
// Os registros aqui são LINHAS CRUAS do `useTable`, com `regra` e `at` presos
// no `details`, pelo mesmo motivo do teste do lembrete do sono (#356).

import {
  LIMIAR_DA_ESCADA,
  REGRAS,
  degrausDaTabela,
  estadoDaEscada,
  noiteDoRitual,
  podeComecar,
  prazoDaRegra,
  regraConsistente,
  ritualDe,
  sinaisDaRegra,
  sugerirAlvo,
  textoDaRegra,
  veredictosDaRegra,
} from "@/constants/sleepHygiene";

const em = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();

/** Ritual cumprido no dia `d` de outubro, às `at`, registrado na hora. */
const ritual = (d, regra, at, extra = {}) => {
  const [h, m] = at.split(":").map(Number);
  return {
    type: "sleep",
    quantity: 0,
    unit: "regra",
    createdAt: extra.createdAt ?? em(d, h, m),
    details: JSON.stringify({ regra, at }),
  };
};

/** `n` noites seguidas cumprindo a regra, terminando no dia `ate`. */
const noites = (n, regra, at, ate) =>
  Array.from({ length: n }, (_, i) => ritual(ate - n + 1 + i, regra, at));

describe("as regras no relógio da pessoa", () => {
  it("contam a partir do horário-alvo, como na tabela da issue", () => {
    expect(prazoDaRegra("10", "23:00")).toBe("13:00");
    expect(prazoDaRegra("3", "23:00")).toBe("20:00");
    expect(prazoDaRegra("2", "23:00")).toBe("21:00");
    expect(prazoDaRegra("1", "23:00")).toBe("22:00");
  });

  it("dão a volta na meia-noite", () => {
    expect(prazoDaRegra("3", "02:00")).toBe("23:00");
    expect(prazoDaRegra("1", "00:30")).toBe("23:30");
  });

  it("a regra 0 não tem prazo de relógio", () => {
    expect(prazoDaRegra("0", "23:00")).toBeNull();
    expect(textoDaRegra("0", "23:00")).toBe(
      "Levantar no primeiro despertador, sem soneca",
    );
  });

  it("o texto leva o horário", () => {
    expect(textoDaRegra("1", "23:00")).toBe("Sem telas depois das 22:00");
    expect(textoDaRegra("10", "23:30")).toBe("Sem cafeína depois das 13:30");
  });

  it("regra ou alvo inválido não inventa horário", () => {
    expect(prazoDaRegra("5", "23:00")).toBeNull();
    expect(prazoDaRegra("1", "25:00")).toBeNull();
    expect(textoDaRegra("5", "23:00")).toBe("");
  });

  it("são cinco, na ordem do método", () => {
    expect(REGRAS.map((r) => r.key)).toEqual(["10", "3", "2", "1", "0"]);
  });
});

describe("ritualDe", () => {
  it("lê a linha crua e a hidratada", () => {
    expect(ritualDe(ritual(10, "1", "22:00"))).toEqual({
      regra: "1",
      at: "22:00",
    });
    expect(ritualDe({ type: "sleep", regra: "1", at: "22:00" })).toEqual({
      regra: "1",
      at: "22:00",
    });
  });

  it("noite com deitar não é ritual", () => {
    const deitar = {
      type: "sleep",
      createdAt: em(10, 23),
      details: JSON.stringify({ bed: "23:00" }),
    };
    expect(ritualDe(deitar)).toBeNull();
  });

  it("regra desconhecida ou outra métrica também não", () => {
    expect(ritualDe({ type: "sleep", regra: "7" })).toBeNull();
    expect(ritualDe({ type: "water", regra: "1" })).toBeNull();
  });
});

describe("a que noite o ritual pertence", () => {
  it("largar as telas depois da meia-noite ainda é a mesma noite", () => {
    expect(noiteDoRitual(ritual(11, "1", "00:10"), "23:00")).toBe("2026-10-10");
  });

  it("a regra 10 marcada de tarde é a noite do mesmo dia", () => {
    expect(noiteDoRitual(ritual(10, "10", "13:05"), "23:00")).toBe(
      "2026-10-10",
    );
  });

  it("a regra 0 é do dia em que a pessoa acordou", () => {
    expect(noiteDoRitual(ritual(11, "0", "07:10"), "23:00")).toBe("2026-10-11");
  });

  it("a regra 0 antes da fronteira da noite não cai na véspera", () => {
    // Alvo 01:00 põe a fronteira às 07:00; o despertador das 06:30 é de hoje.
    expect(noiteDoRitual(ritual(11, "0", "06:30"), "01:00")).toBe("2026-10-11");
  });

  it("quem deita tarde tem a fronteira mais tarde", () => {
    // Alvo 02:00: a noite vai até as 08:00.
    expect(noiteDoRitual(ritual(11, "1", "01:30"), "02:00")).toBe("2026-10-10");
    expect(noiteDoRitual(ritual(11, "10", "16:00"), "02:00")).toBe(
      "2026-10-11",
    );
  });

  it("registrado depois, vale o horário do ritual, e não o do registro", () => {
    // Largou as telas às 22:00 e só marcou às 07:00 do dia seguinte.
    const atrasado = ritual(10, "1", "22:00", { createdAt: em(11, 7) });
    expect(noiteDoRitual(atrasado, "23:00")).toBe("2026-10-10");
  });

  it("corrigido pra mais tarde que o toque, continua na mesma noite", () => {
    // Tocou "cumpri" às 22:00 e corrigiu pra 23:30.
    const corrigido = ritual(10, "1", "23:30", { createdAt: em(10, 22) });
    expect(noiteDoRitual(corrigido, "23:00")).toBe("2026-10-10");
  });
});

describe("veredictosDaRegra", () => {
  it("uma noite por posição, a mais recente no fim", () => {
    const v = veredictosDaRegra(
      [ritual(10, "1", "22:00")],
      "1",
      "23:00",
      3,
      em(10, 23),
    );
    expect(v).toEqual([
      { dia: "2026-10-08", hit: false },
      { dia: "2026-10-09", hit: false },
      { dia: "2026-10-10", hit: true },
    ]);
  });

  it("só conta a regra pedida", () => {
    const v = veredictosDaRegra(
      [ritual(10, "10", "13:00")],
      "1",
      "23:00",
      1,
      em(10, 23),
    );
    expect(v[0].hit).toBe(false);
  });

  it("a regra 0 cumprida de manhã vale pelo resto do dia", () => {
    const v = veredictosDaRegra(
      [ritual(20, "0", "07:00")],
      "0",
      "23:00",
      2,
      em(20, 22),
    );
    expect(v).toEqual([
      { dia: "2026-10-19", hit: false },
      { dia: "2026-10-20", hit: true },
    ]);
  });

  it("dois registros na mesma noite são uma ocasião", () => {
    const v = veredictosDaRegra(
      [ritual(10, "1", "22:00"), ritual(10, "1", "22:30")],
      "1",
      "23:00",
      1,
      em(10, 23),
    );
    expect(v).toEqual([{ dia: "2026-10-10", hit: true }]);
  });
});

describe("a regra fica consistente", () => {
  const agora = em(20, 23);

  it("3 noites seguidas, mesmo horário: pronta", () => {
    const sinais = sinaisDaRegra(
      noites(3, "1", "22:00", 20),
      "1",
      "23:00",
      agora,
    );
    expect(sinais.consistency.hits).toBe(3);
    expect(sinais.consistency.days).toBe(LIMIAR_DA_ESCADA.window);
    expect(regraConsistente(sinais)).toBe(true);
  });

  it("menos de 3 noites na regra ainda não", () => {
    // A noite antes do começo conta como falta.
    const sinais = sinaisDaRegra(
      noites(2, "1", "22:00", 20),
      "1",
      "23:00",
      agora,
    );
    expect(regraConsistente(sinais)).toBe(false);
  });

  it("uma falta entre as 3 últimas noites ainda não", () => {
    const registros = noites(3, "1", "22:00", 20).filter((_, i) => i !== 1);
    expect(
      regraConsistente(sinaisDaRegra(registros, "1", "23:00", agora)),
    ).toBe(false);
  });

  it("falta mais antiga que a janela não pesa", () => {
    // Cumpriu nos dias 15, 16, 18, 19 e 20; faltou no 17, fora das 3 últimas.
    const registros = noites(6, "1", "22:00", 20).filter((_, i) => i !== 2);
    expect(
      regraConsistente(sinaisDaRegra(registros, "1", "23:00", agora)),
    ).toBe(true);
  });

  it("horário espalhado demais não passa", () => {
    // Alterna 18:00 e 23:30: cinco horas e meia de distância.
    const registros = Array.from({ length: 3 }, (_, i) =>
      ritual(18 + i, "1", i % 2 ? "23:30" : "18:00"),
    );
    const sinais = sinaisDaRegra(registros, "1", "23:00", agora);
    expect(sinais.consistency.hits).toBe(3);
    expect(sinais.regularity.sdMinutes).toBeGreaterThan(
      LIMIAR_DA_ESCADA.regularityMaxSd,
    );
    expect(regraConsistente(sinais)).toBe(false);
  });

  it("a regularidade vem do horário do ritual, e não do registro", () => {
    // Largou as telas sempre às 22:00, marcou entre 22:00 e 08:00.
    const registros = Array.from({ length: 3 }, (_, i) =>
      ritual(18 + i, "1", "22:00", {
        createdAt: em(18 + i, 22) + i * 5 * 3_600_000,
      }),
    );
    const sinais = sinaisDaRegra(registros, "1", "23:00", agora);
    expect(sinais.regularity.sdMinutes).toBeLessThan(1);
    expect(regraConsistente(sinais)).toBe(true);
  });
});

describe("degrausDaTabela", () => {
  it("ordena pelo começo e ignora linha estranha", () => {
    const degraus = degrausDaTabela({
      1: { startedAt: 200 },
      10: { startedAt: 100, conqueredAt: 150 },
      7: { startedAt: 50 },
      2: {},
    });
    expect(degraus).toEqual([
      { regra: "10", startedAt: 100, conqueredAt: 150 },
      { regra: "1", startedAt: 200, conqueredAt: null },
    ]);
  });

  it("tabela vazia: nenhum degrau", () => {
    expect(degrausDaTabela(undefined)).toEqual([]);
  });
});

describe("estadoDaEscada", () => {
  const agora = em(20, 23);

  it("sem nada: não configurada, e as cinco à escolha", () => {
    const e = estadoDaEscada({
      alvo: "",
      degraus: [],
      records: [],
      now: agora,
    });
    expect(e.configurada).toBe(false);
    expect(e.ativa).toBeNull();
    expect(e.disponiveis).toEqual(["10", "3", "2", "1", "0"]);
    expect(podeComecar(e, "1")).toBe(false); // falta o horário-alvo
  });

  it("com alvo e sem regra: escolhe a primeira", () => {
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [],
      records: [],
      now: agora,
    });
    expect(e.configurada).toBe(false);
    expect(podeComecar(e, "1")).toBe(true);
    expect(podeComecar(e, "0")).toBe(true);
  });

  it("com a regra ativa: uma por vez", () => {
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [{ regra: "1", startedAt: em(1, 12), conqueredAt: null }],
      records: [],
      now: agora,
    });
    expect(e.configurada).toBe(true);
    expect(e.desde).toBe(em(1, 12));
    expect(e.ativa).toBe("1");
    expect(e.pronta).toBe(false);
    expect(podeComecar(e, "10")).toBe(false);
  });

  it("a ativa consistente fica pronta pra ser conquistada", () => {
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [{ regra: "1", startedAt: em(1, 12), conqueredAt: null }],
      records: noites(14, "1", "22:00", 20),
      now: agora,
    });
    expect(e.pronta).toBe(true);
  });

  it("conquistada, libera a escolha da próxima", () => {
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [{ regra: "1", startedAt: em(1, 12), conqueredAt: em(15, 8) }],
      records: [],
      now: agora,
    });
    expect(e.ativa).toBeNull();
    expect(e.conquistadas).toEqual(["1"]);
    expect(e.disponiveis).toEqual(["10", "3", "2", "0"]);
    expect(podeComecar(e, "1")).toBe(false);
    expect(podeComecar(e, "10")).toBe(true);
  });

  it("conquista não se perde quando a regra para de ser marcada", () => {
    // Nenhum registro da regra 1: ela continua conquistada.
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [
        { regra: "1", startedAt: em(1, 12), conqueredAt: em(15, 8) },
        { regra: "10", startedAt: em(15, 9), conqueredAt: null },
      ],
      records: [],
      now: agora,
    });
    expect(e.conquistadas).toEqual(["1"]);
    expect(e.ativa).toBe("10");
  });

  it("corrida entre aparelhos com duas ativas: vale a mais antiga", () => {
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: degrausDaTabela({
        1: { startedAt: em(1, 12) },
        10: { startedAt: em(1, 13) },
      }),
      records: [],
      now: agora,
    });
    expect(e.ativa).toBe("1");
  });

  it("as cinco conquistadas: completa", () => {
    const degraus = REGRAS.map((r, i) => ({
      regra: r.key,
      startedAt: i + 1,
      conqueredAt: i + 2,
    }));
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus,
      records: [],
      now: agora,
    });
    expect(e.completa).toBe(true);
    expect(e.disponiveis).toEqual([]);
  });
});

describe("sugerirAlvo", () => {
  it("arredonda o deitar típico pra baixo em 15 minutos", () => {
    expect(sugerirAlvo(23 * 60 + 40)).toBe("23:30");
    expect(sugerirAlvo(30)).toBe("00:30");
  });

  it("sem histórico, 23:00", () => {
    expect(sugerirAlvo(null)).toBe("23:00");
  });
});
