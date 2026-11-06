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
  noitesSeguidas,
  podeComecar,
  prazoDaRegra,
  ritualDe,
  sequenciaCompleta,
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

  it("o 0 do método fica fora da escada (28/10)", () => {
    expect(prazoDaRegra("0", "23:00")).toBeNull();
    expect(textoDaRegra("0", "23:00")).toBe("");
  });

  it("o 2 é esforço intenso, como no vídeo de referência", () => {
    expect(textoDaRegra("2", "23:00")).toBe(
      "Sem esforço intenso depois das 21:00",
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

  it("são quatro, na ordem do método", () => {
    expect(REGRAS.map((r) => r.key)).toEqual(["10", "3", "2", "1"]);
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

describe("o 0 que saiu da escada", () => {
  it("registro antigo de regra 0 ainda é ritual, e não uma noite de 0h", () => {
    expect(ritualDe(ritual(20, "0", "07:00"))).toEqual({
      regra: "0",
      at: "07:00",
    });
  });

  it("degrau antigo de regra 0 é ignorado", () => {
    expect(degrausDaTabela({ 0: { startedAt: 100 } })).toEqual([]);
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

describe("a regra vira rotina com 3 noites seguidas", () => {
  const agora = em(20, 23);
  const forma = (registros) => sequenciaCompleta(registros, "1", "23:00");

  it("3 noites seguidas formam", () => {
    expect(forma(noites(3, "1", "22:00", 20))).toBe(true);
    expect(LIMIAR_DA_ESCADA.window).toBe(3);
  });

  it("2 noites ainda não", () => {
    expect(forma(noites(2, "1", "22:00", 20))).toBe(false);
  });

  it("3 noites com uma falta no meio ainda não", () => {
    expect(forma(noites(4, "1", "22:00", 20).filter((_, i) => i !== 1))).toBe(
      false,
    );
  });

  it("o horário do toque não pesa (#413)", () => {
    // Os toques reais da "sem cafeína": 14:31, 14:40, 19:13 e 10:29.
    const registros = [
      ritual(28, "10", "14:31"),
      ritual(29, "10", "14:40"),
      ritual(30, "10", "19:13"),
      ritual(31, "10", "10:29"),
    ];
    expect(sequenciaCompleta(registros, "10", "23:00")).toBe(true);
  });

  it("a sequência vale mesmo fora das últimas noites (#413)", () => {
    // Cumpriu de 10 a 12 e parou. Hoje, dia 20, a regra continua formada.
    expect(forma(noites(3, "1", "22:00", 12))).toBe(true);
    expect(
      noitesSeguidas(noites(3, "1", "22:00", 12), "1", "23:00", agora),
    ).toBe(0);
  });

  it("dois registros na mesma noite são uma noite só", () => {
    const registros = [
      ...noites(2, "1", "22:00", 20),
      ritual(20, "1", "22:30"),
    ];
    expect(forma(registros)).toBe(false);
  });
});

describe("noitesSeguidas, o N do cartão", () => {
  it("conta até hoje quando hoje já foi cumprida", () => {
    expect(
      noitesSeguidas(noites(2, "1", "22:00", 20), "1", "23:00", em(20, 23)),
    ).toBe(2);
  });

  it("hoje ainda em aberto não quebra a sequência", () => {
    expect(
      noitesSeguidas(noites(2, "1", "22:00", 19), "1", "23:00", em(20, 15)),
    ).toBe(2);
  });

  it("uma noite pulada recomeça a contagem", () => {
    expect(
      noitesSeguidas(noites(2, "1", "22:00", 18), "1", "23:00", em(20, 23)),
    ).toBe(0);
  });

  it("noite de madrugada é a da véspera", () => {
    // Largou as telas às 00:10 do dia 21, que ainda é a noite do 20.
    const registros = [
      ...noites(1, "1", "22:00", 19),
      ritual(21, "1", "00:10"),
    ];
    expect(noitesSeguidas(registros, "1", "23:00", em(21, 0, 20))).toBe(2);
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

  it("sem nada: não configurada, e as quatro à escolha", () => {
    const e = estadoDaEscada({
      alvo: "",
      degraus: [],
      records: [],
      now: agora,
    });
    expect(e.configurada).toBe(false);
    expect(e.ativa).toBeNull();
    expect(e.disponiveis).toEqual(["10", "3", "2", "1"]);
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
    expect(podeComecar(e, "10")).toBe(true);
    expect(podeComecar(e, "0")).toBe(false);
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
    expect(e.seguidas).toBe(14);
  });

  it("a sequência antiga ainda deixa pronta, e o cartão conta de novo (#413)", () => {
    // O caso real: 28 a 31/10 cumpridas, 1/11 pulada, aberto em 2/11.
    const e = estadoDaEscada({
      alvo: "23:00",
      degraus: [{ regra: "10", startedAt: em(28, 14), conqueredAt: null }],
      records: [
        ritual(28, "10", "14:31"),
        ritual(29, "10", "14:40"),
        ritual(30, "10", "19:13"),
        ritual(31, "10", "10:29"),
      ],
      now: new Date(2026, 10, 2, 9, 30).getTime(),
    });
    expect(e.pronta).toBe(true);
    expect(e.seguidas).toBe(0);
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
    expect(e.disponiveis).toEqual(["10", "3", "2"]);
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

  it("as quatro conquistadas: completa", () => {
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
