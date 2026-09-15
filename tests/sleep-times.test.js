// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// Horários de sono (#328). O que se trava aqui é a razão da mudança: os
// horários eram descartados na gravação, e por isso a edição só conseguia
// oferecer duração.

import {
  durationFromTimes,
  latestBed,
  nightInstant,
  parseHHMM,
  sleepTimeIssue,
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

describe("sleepTimeIssue", () => {
  it("NÃO reclama da noite que atravessa a meia-noite", () => {
    // O caso mais comum do app. Uma regra de "acordar depois de deitar"
    // rejeitaria isto, porque 07:00 é numericamente menor que 23:40.
    expect(sleepTimeIssue("23:40", "07:00")).toBeNull();
    expect(sleepTimeIssue("22:00", "06:30")).toBeNull();
    expect(sleepTimeIssue("00:30", "08:00")).toBeNull();
  });

  it("não reclama de noite longa mas plausível", () => {
    // Doença e recuperação chegam a 12 ou 14 horas, e isso é registro
    // legítimo. O teto existe pra pegar inversão, não sono longo.
    expect(sleepTimeIssue("22:00", "10:00")).toBeNull();
    expect(sleepTimeIssue("21:00", "11:00")).toBeNull();
  });

  it("reclama de horários trocados", () => {
    // Deitar 23:00 e acordar 22:00 dá 23 horas, e o app aceitava em silêncio.
    expect(sleepTimeIssue("23:00", "22:00")).toMatch(/23h/);
    // 17h30 arredonda pra 18h na mensagem, que é o que a pessoa lê.
    expect(sleepTimeIssue("07:00", "00:30")).toMatch(/18h/);
  });

  it("silencia quando não há acordar", () => {
    // Deitar sozinho é registro válido (§4.2), e não pode virar erro.
    expect(sleepTimeIssue("23:40", "")).toBeNull();
    expect(sleepTimeIssue("23:40", undefined)).toBeNull();
  });

  it("silencia quando o deitar não lê", () => {
    expect(sleepTimeIssue("", "07:00")).toBeNull();
    expect(sleepTimeIssue("lixo", "07:00")).toBeNull();
  });

  it("o teto é exatamente 16h, e 16h ainda passa", () => {
    // A borda importa: quem definir o teto de novo precisa ver o limite.
    expect(sleepTimeIssue("22:00", "14:00")).toBeNull();
    expect(sleepTimeIssue("22:00", "14:01")).not.toBeNull();
  });
});

describe("nightInstant", () => {
  const em = (dia, h, m = 0) => new Date(2026, 8, dia, h, m, 0).getTime();
  const diaDe = (ts) => new Date(ts).getDate();

  it("a mesma noite dá o mesmo dia, registrada à noite ou de manhã", () => {
    // O defeito que motivou tudo: tocar "deitar agora" às 23:40 contava num
    // dia, e registrar a mesma noite de manhã contava em outro.
    const aNoite = nightInstant({ bed: "23:40", createdAt: em(14, 23, 45) });
    const deManha = nightInstant({ bed: "23:40", createdAt: em(15, 8) });
    expect(diaDe(aNoite)).toBe(diaDe(deManha));
    expect(diaDe(aNoite)).toBe(14);
  });

  it("23h50 e 00h10 caem no MESMO dia", () => {
    // O furo do "dia do início" puro: sem a fronteira das 18h, segunda
    // ficaria vazia pra quem oscila em torno da meia-noite, mesmo tendo
    // dormido todas as noites.
    const antes = nightInstant({ bed: "23:50", createdAt: em(15, 8) });
    const depois = nightInstant({ bed: "00:10", createdAt: em(15, 8) });
    expect(diaDe(antes)).toBe(14);
    expect(diaDe(depois)).toBe(14);
  });

  it("noites seguidas caem em dias seguidos", () => {
    const seg = nightInstant({ bed: "23:00", createdAt: em(15, 7) });
    const ter = nightInstant({ bed: "23:00", createdAt: em(16, 7) });
    expect(diaDe(seg)).toBe(14);
    expect(diaDe(ter)).toBe(15);
  });

  it("madrugada pertence ao dia anterior", () => {
    expect(diaDe(nightInstant({ bed: "02:00", createdAt: em(15, 9) }))).toBe(
      14,
    );
  });

  it("devolve null sem horário, pra cair no createdAt", () => {
    // Todo registro anterior ao #328 é assim, e é a maioria do histórico.
    expect(nightInstant({ createdAt: em(15, 8) })).toBeNull();
    expect(nightInstant({ bed: "lixo", createdAt: em(15, 8) })).toBeNull();
    expect(nightInstant({ bed: "23:40" })).toBeNull();
    expect(nightInstant(null)).toBeNull();
  });
});
