// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Coerência entre início, fim e duração (#366).
//
// É aqui que mora a regra que o app inteiro vai usar pras três métricas de
// tempo, e onde bug moraria: derivar o campo errado, aceitar três valores que
// se contradizem, aliasar duração de 25h como 1h pelo módulo de 1440, ou
// recusar sessão que legitimamente atravessa a meia-noite.

import {
  MAX_SPAN_MIN,
  SPAN_NAMES,
  reconcileTimes,
  spanLabel,
  spanRecord,
} from "@/constants/timeSpan";

const r = (campos) => reconcileTimes(campos);

describe("deriva o terceiro a partir de dois", () => {
  it("início e fim dão a duração", () => {
    const out = r({ start: "10:00", end: "11:30" });
    expect(out.duration).toBe("1:30");
    expect(out.derived).toBe("duration");
    expect(out.issue).toBeNull();
  });

  it("início e duração dão o fim", () => {
    const out = r({ start: "10:00", duration: "1:30" });
    expect(out.end).toBe("11:30");
    expect(out.derived).toBe("end");
  });

  it("fim e duração dão o início", () => {
    const out = r({ end: "11:30", duration: "1:30" });
    expect(out.start).toBe("10:00");
    expect(out.derived).toBe("start");
  });
});

describe("atravessar a meia-noite", () => {
  it("fim antes do início significa que virou o dia", () => {
    expect(r({ start: "23:00", end: "01:00" }).duration).toBe("2:00");
  });

  it("início mais duração passa da meia-noite", () => {
    expect(r({ start: "23:00", duration: "2:00" }).end).toBe("01:00");
  });

  it("fim menos duração volta pro dia anterior", () => {
    expect(r({ end: "01:00", duration: "2:00" }).start).toBe("23:00");
  });
});

describe("três preenchidos e coerentes", () => {
  it("passam sem issue e sem campo calculado", () => {
    const out = r({ start: "10:00", end: "11:30", duration: "1:30" });
    expect(out.issue).toBeNull();
    expect(out.derived).toBeNull();
  });

  it("atravessando a meia-noite também passam", () => {
    expect(
      r({ start: "23:00", end: "01:00", duration: "2:00" }).issue,
    ).toBeNull();
  });
});

describe("três preenchidos e contraditórios: um cede", () => {
  // A primeira versão travava o save aqui. O argumento ("o app não sabe qual
  // dos três a pessoa quis dizer") ignorava a sequência: três campos
  // preenchidos só existem depois de alguém digitar o terceiro, e o terceiro é
  // a informação mais nova da tela.
  //
  // Regra: o tocado por último vence, e cede o de papel mais fraco entre os
  // outros dois (duração, depois fim, nunca o início).

  it("nunca trava", () => {
    for (const lastEdited of ["start", "end", "duration", null]) {
      const out = r({
        start: "10:00",
        end: "11:30",
        duration: "2:00",
        lastEdited,
      });
      expect(out.issue).toBeNull();
      expect(out.derived).not.toBeNull();
    }
  });

  it("digitar a duração move o FIM, porque o início é o fato vivido", () => {
    const out = r({
      start: "10:00",
      end: "11:30",
      duration: "2:00",
      lastEdited: "duration",
    });
    expect(out).toMatchObject({
      start: "10:00",
      end: "12:00",
      duration: "2:00",
      derived: "end",
    });
  });

  it("digitar o fim recalcula a DURAÇÃO", () => {
    const out = r({
      start: "10:00",
      end: "12:30",
      duration: "2:00",
      lastEdited: "end",
    });
    expect(out).toMatchObject({
      start: "10:00",
      end: "12:30",
      duration: "2:30",
      derived: "duration",
    });
  });

  it("digitar o início recalcula a DURAÇÃO, e não mexe no fim", () => {
    const out = r({
      start: "09:00",
      end: "11:30",
      duration: "2:00",
      lastEdited: "start",
    });
    expect(out).toMatchObject({
      start: "09:00",
      end: "11:30",
      duration: "2:30",
      derived: "duration",
    });
  });

  it("o início NUNCA é o campo recalculado", () => {
    // É o único dos três que a pessoa viveu em vez de calcular. Recência pura
    // o moveria no primeiro caso, e essa é a pior resposta possível.
    for (const lastEdited of ["start", "end", "duration", null]) {
      const out = r({
        start: "10:00",
        end: "11:30",
        duration: "2:00",
        lastEdited,
      });
      expect(out.derived).not.toBe("start");
      expect(out.start).toBe("10:00");
    }
  });

  it("sem rastro de edição cede a duração", () => {
    // Caso de quem chama sem estado de UI, como a hidratação de um registro.
    const out = r({ start: "10:00", end: "11:30", duration: "2:00" });
    expect(out.derived).toBe("duration");
    expect(out.duration).toBe("1:30");
  });

  it("resolve atravessando a meia-noite", () => {
    const out = r({
      start: "23:00",
      end: "01:00",
      duration: "3:00",
      lastEdited: "duration",
    });
    expect(out.end).toBe("02:00");
  });
});

describe("formulário pela metade não é erro", () => {
  it("nenhum campo", () => {
    expect(r({}).issue).toBeNull();
    expect(reconcileTimes().issue).toBeNull();
  });

  it("um campo só, em qualquer posição", () => {
    for (const campos of [
      { start: "10:00" },
      { end: "11:00" },
      { duration: "1:00" },
    ]) {
      const out = r(campos);
      expect(out.issue).toBeNull();
      expect(out.derived).toBeNull();
    }
  });
});

describe("teto de sanidade: avisa e deixa salvar", () => {
  // Era `issue`, e travava. "14h deitado" é suspeita, e não impossibilidade,
  // e dois dos três tetos são palpite. Bloquear o save por palpite é o app
  // recusando um registro que pode estar certo.
  const max = MAX_SPAN_MIN.exercise; // 6h

  it("acima do teto avisa, porque costuma ser dígito trocado", () => {
    // 09:00 no lugar de 19:00 daria 14h sem reclamar, se não houvesse teto.
    const out = r({ start: "19:00", end: "09:00", maxMin: max });
    expect(out.warning.code).toBe("longa-demais");
    expect(out.warning.message).toContain("14:00");
  });

  it("o aviso NÃO impede o save", () => {
    expect(r({ start: "19:00", end: "09:00", maxMin: max }).issue).toBeNull();
  });

  it("dentro do teto não avisa", () => {
    expect(r({ start: "19:00", end: "20:00", maxMin: max }).warning).toBeNull();
  });

  it("sem teto informado, não reclama de duração nenhuma", () => {
    expect(r({ start: "19:00", end: "09:00" }).warning).toBeNull();
  });

  it("vale quando os três vêm preenchidos e coerentes", () => {
    const out = r({
      start: "19:00",
      end: "09:00",
      duration: "14:00",
      maxMin: max,
    });
    expect(out.warning.code).toBe("longa-demais");
    expect(out.issue).toBeNull();
  });

  it("vale também no campo que foi recalculado", () => {
    const out = r({
      start: "19:00",
      end: "20:00",
      duration: "14:00",
      maxMin: max,
      lastEdited: "duration",
    });
    expect(out.end).toBe("09:00");
    expect(out.warning.code).toBe("longa-demais");
  });
});

describe("teto do sono, absorvido do #353", () => {
  // Estes casos vinham de `sleepTimeIssue`, que este módulo substituiu. Ficam
  // aqui pra proteção não sumir junto com a função.
  const max = MAX_SPAN_MIN.sleep; // 16h

  it("a noite típica atravessa a meia-noite e não reclama", () => {
    // O acordar é numericamente MENOR que o deitar, e isso é o caso comum.
    for (const [bed, wake] of [
      ["23:40", "07:00"],
      ["22:00", "06:30"],
      ["00:30", "08:00"],
    ]) {
      expect(r({ start: bed, end: wake, maxMin: max }).warning).toBeNull();
    }
  });

  it("noite longa de recuperação ainda passa", () => {
    expect(r({ start: "22:00", end: "10:00", maxMin: max }).warning).toBeNull();
    expect(r({ start: "21:00", end: "11:00", maxMin: max }).warning).toBeNull();
  });

  it("horários invertidos aparecem como duração implausível", () => {
    expect(r({ start: "23:00", end: "22:00", maxMin: max }).warning.code).toBe(
      "longa-demais",
    );
    expect(
      r({ start: "07:00", end: "00:30", maxMin: max }).warning.message,
    ).toContain("17:30");
  });

  it("a fronteira do teto é exata", () => {
    expect(r({ start: "22:00", end: "14:00", maxMin: max }).warning).toBeNull();
    expect(
      r({ start: "22:00", end: "14:01", maxMin: max }).warning,
    ).not.toBeNull();
  });

  it("deitar sem acordar segue sendo registro válido", () => {
    // §4.2: deitar é o comportamento, acordar é opcional.
    expect(r({ start: "23:40", maxMin: max }).warning).toBeNull();
  });

  it("o teto também pega deitar mais duração, que o #353 não via", () => {
    // Ganho real da unificação: antes só o par de horários era checado.
    expect(
      r({ start: "23:00", duration: "18:00", maxMin: max }).warning.code,
    ).toBe("longa-demais");
  });
});

describe("entradas que não dá pra interpretar", () => {
  it("duração de 24h ou mais não cabe em dois horários de relógio", () => {
    // Sem esta guarda o `% 1440` faria 25h bater com 1h e passar como
    // coerente, que é pior que recusar.
    const out = r({ start: "10:00", end: "11:00", duration: "25:00" });
    expect(out.issue.code).toBe("duracao-longa");
  });

  it("horário ilegível trava em vez de virar zero", () => {
    for (const campos of [
      { start: "abacaxi", end: "11:00" },
      { start: "25:00", end: "11:00" },
      { start: "10:61", end: "11:00" },
      { start: "10:00", end: "11:00", duration: "xx:yy" },
      { start: "10:00", end: "11:00", duration: "1:75" },
    ]) {
      expect(r(campos).issue.code).toBe("formato");
    }
  });

  it("vazio é ausência, e não valor zero", () => {
    // "" tem que contar como não preenchido: se virasse 0, um formulário
    // vazio pareceria uma sessão de duração zero começando à meia-noite.
    const out = r({ start: "10:00", end: "", duration: "" });
    expect(out.issue).toBeNull();
    expect(out.derived).toBeNull();
  });
});

describe("formato de saída", () => {
  it("horário sai com dois dígitos na hora, duração sai sem zero à esquerda", () => {
    const out = r({ start: "09:05", duration: "0:30" });
    expect(out.end).toBe("09:35");
    expect(out.duration).toBe("0:30");
  });

  it("duração de mais de 10h não ganha zero à esquerda", () => {
    expect(r({ start: "00:00", end: "11:00" }).duration).toBe("11:00");
  });
});

describe("spanRecord", () => {
  // Esta é a parte que o `update` pode apagar sem avisar: ele RECONSTRÓI o
  // `details`, então campo que não entra no payload SOME, e a suíte fica verde
  // (#328, #332). Os três nomes diferentes existem porque os registros
  // existentes têm nomes diferentes, e não por escolha.

  it("grava a duração em minutos, inclusive a derivada", () => {
    const span = reconcileTimes({ start: "10:00", end: "11:30" });
    expect(spanRecord(span, SPAN_NAMES.study).quantity).toBe(90);
  });

  it("o estudo omite horário ausente, porque o campo é novo", () => {
    const span = reconcileTimes({ duration: "0:45" });
    expect(spanRecord(span, SPAN_NAMES.study)).toEqual({ quantity: 45 });
  });

  it("o exercício e o sono sempre escrevem o início, mesmo vazio", () => {
    // Omitir passaria a APAGAR o campo desses registros no update, que é
    // mudança que a tela não pediu.
    const span = reconcileTimes({ duration: "0:45" });
    expect(spanRecord(span, SPAN_NAMES.exercise)).toEqual({
      quantity: 45,
      trainingTime: "",
    });
    expect(spanRecord(span, SPAN_NAMES.sleep)).toEqual({
      quantity: 45,
      bed: "",
    });
  });

  it("cada métrica usa os nomes dos próprios registros", () => {
    const span = reconcileTimes({ start: "23:00", end: "07:00" });
    expect(spanRecord(span, SPAN_NAMES.sleep)).toEqual({
      quantity: 480,
      bed: "23:00",
      wake: "07:00",
    });
    expect(spanRecord(span, SPAN_NAMES.exercise)).toEqual({
      quantity: 480,
      trainingTime: "23:00",
      end: "07:00",
    });
    expect(spanRecord(span, SPAN_NAMES.study)).toEqual({
      quantity: 480,
      start: "23:00",
      end: "07:00",
    });
  });

  it("o fim derivado é gravado como qualquer outro", () => {
    // O valor aparece dim na tela, e isso é procedência, e não rascunho.
    const span = reconcileTimes({ start: "18:30", duration: "1:00" });
    expect(spanRecord(span, SPAN_NAMES.exercise).end).toBe("19:30");
  });

  it("duração zero é gravada, porque no sono significa não informado", () => {
    // §4.2: deitar sozinho é registro válido, e a Home mostra o horário em vez
    // de formatar zero como "0:00".
    const span = reconcileTimes({ start: "23:40" });
    expect(spanRecord(span, SPAN_NAMES.sleep)).toEqual({
      quantity: 0,
      bed: "23:40",
    });
  });
});

describe("spanLabel", () => {
  it("mostra a faixa quando há os dois horários", () => {
    expect(spanLabel({ trainingTime: "18:30", end: "19:30" }, "exercise")).toBe(
      "18:30-19:30",
    );
    expect(spanLabel({ bed: "23:00", wake: "07:00" }, "sleep")).toBe(
      "23:00-07:00",
    );
  });

  it("mostra só o início quando não há fim", () => {
    expect(spanLabel({ trainingTime: "18:30" }, "exercise")).toBe("18:30");
  });

  it("sem início não mostra nada, nem com fim presente", () => {
    expect(spanLabel({ end: "19:30" }, "exercise")).toBe("");
    expect(spanLabel({}, "study")).toBe("");
    expect(spanLabel(null, "study")).toBe("");
  });

  it("horário ilegível não vira faixa", () => {
    // O histórico tem registro com trainingTime ":" de quem não preencheu.
    expect(spanLabel({ trainingTime: ":" }, "exercise")).toBe("");
    expect(spanLabel({ trainingTime: "18:30", end: ":" }, "exercise")).toBe(
      "18:30",
    );
  });

  it("métrica sem horário devolve vazio em vez de quebrar", () => {
    expect(spanLabel({ start: "10:00" }, "water")).toBe("");
  });

  it("registro CRU não rende faixa, e isso é a armadilha do #356", () => {
    // Os campos ficam presos no `details`, e aqui o retorno é vazio sem erro
    // nenhum. Quem chama tem que passar registro hidratado.
    expect(
      spanLabel({ details: JSON.stringify({ bed: "23:00" }) }, "sleep"),
    ).toBe("");
  });
});
