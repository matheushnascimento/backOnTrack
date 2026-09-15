// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Horários de sono (#328). O que se trava aqui é a razão da mudança: os
// horários eram descartados na gravação, e por isso a edição só conseguia
// oferecer duração.

import {
  durationFromTimes,
  latestBed,
  parseHHMM,
  timesFrom,
} from "../constants/sleepTimes";

describe("parseHHMM", () => {
  it("lê um horário comum", () => {
    expect(parseHHMM("23:40")).toBe(23 * 60 + 40);
    expect(parseHHMM("7:00")).toBe(420);
  });

  it("trata meia-noite como horário, não como ausência", () => {
    // O hhmmToMinutes de constants/duration.js devolve 0 pra entrada inválida
    // também, e é por isso que este helper existe separado: aqui 0 é um
    // horário legítimo e "não consegui ler" precisa ser null.
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("lixo")).toBeNull();
  });

  it("recusa horário fora do relógio", () => {
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("12:60")).toBeNull();
  });

  it("recusa o que não é string", () => {
    expect(parseHHMM(null)).toBeNull();
    expect(parseHHMM(480)).toBeNull();
  });
});

describe("durationFromTimes", () => {
  it("atravessa a meia-noite", () => {
    // O caso normal de quem dorme: 23:40 às 07:00 são 7h20, não negativo.
    expect(durationFromTimes("23:40", "07:00")).toBe(440);
  });

  it("funciona dentro do mesmo dia", () => {
    expect(durationFromTimes("01:00", "09:30")).toBe(510);
  });

  it("recusa duração zero", () => {
    // Deitar e acordar no mesmo minuto não é uma noite.
    expect(durationFromTimes("07:00", "07:00")).toBeNull();
  });

  it("recusa quando algum horário não lê", () => {
    expect(durationFromTimes("23:40", "")).toBeNull();
    expect(durationFromTimes("", "07:00")).toBeNull();
  });
});

describe("timesFrom", () => {
  it("devolve os horários quando o registro os tem", () => {
    expect(timesFrom({ bed: "23:40", wake: "07:00" })).toEqual({
      bed: "23:40",
      wake: "07:00",
    });
  });

  it("devolve null pro registro antigo, que é a maioria do histórico", () => {
    // É este null que faz a edição cair no formulário de duração em vez de
    // mostrar dois campos vazios fingindo que o dado existe.
    expect(timesFrom({ quantity: 480, score: 4 })).toBeNull();
    expect(timesFrom({ bed: "", wake: "" })).toBeNull();
    expect(timesFrom(null)).toBeNull();
  });

  it("aceita deitar sozinho, com acordar em branco (#349)", () => {
    // Desde que o deitar virou o único campo obrigatório, existe registro com
    // deitar e sem acordar. Exigir os dois aqui mandaria esse registro pro
    // formulário de DURAÇÃO, que é justamente o dado que ele não tem.
    expect(timesFrom({ bed: "23:40" })).toEqual({ bed: "23:40", wake: "" });
    expect(timesFrom({ bed: "23:40", wake: "lixo" })).toEqual({
      bed: "23:40",
      wake: "",
    });
  });
});

describe("latestBed", () => {
  const reg = (bed, createdAt) => ({ bed, createdAt });

  it("devolve o deitar mais recente", () => {
    const lista = [reg("22:00", 100), reg("23:40", 300), reg("01:00", 200)];
    expect(latestBed(lista)).toBe("23:40");
  });

  it("ignora registro sem horário válido", () => {
    // O histórico anterior ao #328 não tem `bed`, e a Home não pode mostrar
    // undefined como se fosse horário.
    expect(latestBed([reg(undefined, 300), reg("23:40", 100)])).toBe("23:40");
    expect(latestBed([reg("25:00", 300), reg("23:40", 100)])).toBe("23:40");
  });

  it("devolve null quando nenhum registro tem horário", () => {
    expect(latestBed([reg(undefined, 1), reg("", 2)])).toBeNull();
    expect(latestBed([])).toBeNull();
    expect(latestBed(undefined)).toBeNull();
  });

  it("tolera registro sem createdAt", () => {
    expect(latestBed([reg("23:40")])).toBe("23:40");
  });
});
