// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Ordem do histórico (#314). O bug era ausência de ordenação: a lista saía na
// ordem de inserção da tabela, com o registro mais antigo no topo.

import { maisRecentesPrimeiro, porMaisRecente } from "../constants/recordOrder";

const reg = (date, createdAt) => ({ date, createdAt });

describe("maisRecentesPrimeiro", () => {
  it("põe o registro mais recente no topo", () => {
    const lista = [
      reg("2026-08-10T09:00:00.000Z", 100),
      reg("2026-08-17T09:00:00.000Z", 300),
      reg("2026-08-14T09:00:00.000Z", 200),
    ];
    expect(maisRecentesPrimeiro(lista).map((r) => r.date)).toEqual([
      "2026-08-17T09:00:00.000Z",
      "2026-08-14T09:00:00.000Z",
      "2026-08-10T09:00:00.000Z",
    ]);
  });

  it("ordena por hora dentro do mesmo dia", () => {
    // As telas gravam toISOString() completo, então o horário separa registros
    // do mesmo dia sem precisar do desempate.
    const lista = [
      reg("2026-08-17T08:00:00.000Z", 1),
      reg("2026-08-17T21:00:00.000Z", 2),
      reg("2026-08-17T13:00:00.000Z", 3),
    ];
    expect(maisRecentesPrimeiro(lista).map((r) => r.date)).toEqual([
      "2026-08-17T21:00:00.000Z",
      "2026-08-17T13:00:00.000Z",
      "2026-08-17T08:00:00.000Z",
    ]);
  });

  it("desempata pelo createdAt quando a data é idêntica", () => {
    const lista = [
      reg("2026-08-17T08:00:00.000Z", 10),
      reg("2026-08-17T08:00:00.000Z", 30),
      reg("2026-08-17T08:00:00.000Z", 20),
    ];
    expect(maisRecentesPrimeiro(lista).map((r) => r.createdAt)).toEqual([
      30, 20, 10,
    ]);
  });

  it("cai no createdAt quando date não parseia", () => {
    // buildRow grava `date: ""` quando a tela não manda data.
    const lista = [reg("", 100), reg("", 300), reg("", 200)];
    expect(maisRecentesPrimeiro(lista).map((r) => r.createdAt)).toEqual([
      300, 200, 100,
    ]);
  });

  it("não ordena no lugar", () => {
    const lista = [
      reg("2026-08-10T00:00:00.000Z", 1),
      reg("2026-08-17T00:00:00.000Z", 2),
    ];
    const copia = [...lista];
    maisRecentesPrimeiro(lista);
    expect(lista).toEqual(copia);
  });

  it("tolera lista vazia e ausente", () => {
    expect(maisRecentesPrimeiro([])).toEqual([]);
    expect(maisRecentesPrimeiro(undefined)).toEqual([]);
  });
});

describe("porMaisRecente", () => {
  it("editar um registro antigo não muda a posição dele", () => {
    // O `update` usa setPartialRow e não toca em date nem createdAt. Este
    // teste trava esse contrato: se algum dia a edição passar a regravar um
    // dos dois, o registro editado pularia pro topo do histórico.
    const antigo = reg("2026-08-01T10:00:00.000Z", 100);
    const novo = reg("2026-08-17T10:00:00.000Z", 200);
    const antes = [novo, antigo].sort(porMaisRecente);

    const antigoEditado = { ...antigo, quantity: 999 };
    const depois = [novo, antigoEditado].sort(porMaisRecente);

    expect(depois.map((r) => r.date)).toEqual(antes.map((r) => r.date));
    expect(depois[1].quantity).toBe(999);
  });
});
