// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Coerência entre início, fim e duração (#366).
//
// É aqui que mora a regra que o app inteiro vai usar pras três métricas de
// tempo, e onde bug moraria: derivar o campo errado, aceitar três valores que
// se contradizem, aliasar duração de 25h como 1h pelo módulo de 1440, ou
// recusar sessão que legitimamente atravessa a meia-noite.

import { reconcileTimes, MAX_SPAN_MIN } from "@/constants/timeSpan";

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

describe("três preenchidos", () => {
  it("coerentes passam sem issue", () => {
    const out = r({ start: "10:00", end: "11:30", duration: "1:30" });
    expect(out.issue).toBeNull();
    expect(out.derived).toBeNull();
  });

  it("coerentes atravessando a meia-noite também passam", () => {
    expect(
      r({ start: "23:00", end: "01:00", duration: "2:00" }).issue,
    ).toBeNull();
  });

  it("contraditórios travam, e a mensagem diz o que não fecha", () => {
    // O ponto do recurso: o app não escolhe qual dos três é verdade.
    const out = r({ start: "10:00", end: "11:30", duration: "2:00" });
    expect(out.issue.code).toBe("conflito");
    expect(out.issue.message).toContain("1:30");
    expect(out.issue.message).toContain("2:00");
  });

  it("não reescreve os campos quando trava", () => {
    // Devolver valores "corrigidos" junto do erro faria a tela mudar debaixo
    // da pessoa no mesmo instante em que diz que algo está errado.
    const out = r({ start: "10:00", end: "11:30", duration: "2:00" });
    expect(out).toMatchObject({
      start: "10:00",
      end: "11:30",
      duration: "2:00",
    });
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

describe("teto de sanidade", () => {
  const max = MAX_SPAN_MIN.exercise; // 6h

  it("acima do teto aponta, porque costuma ser dígito trocado", () => {
    // 09:00 no lugar de 19:00 daria 14h sem reclamar, se não houvesse teto.
    const out = r({ start: "19:00", end: "09:00", maxMin: max });
    expect(out.issue.code).toBe("longa-demais");
    expect(out.issue.message).toContain("14:00");
  });

  it("dentro do teto passa", () => {
    expect(r({ start: "19:00", end: "20:00", maxMin: max }).issue).toBeNull();
  });

  it("sem teto informado, não reclama de duração nenhuma", () => {
    expect(r({ start: "19:00", end: "09:00" }).issue).toBeNull();
  });

  it("vale também quando os três vêm preenchidos e coerentes", () => {
    const out = r({
      start: "19:00",
      end: "09:00",
      duration: "14:00",
      maxMin: max,
    });
    expect(out.issue.code).toBe("longa-demais");
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
