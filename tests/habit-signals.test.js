// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import {
  consistency,
  dailyVerdicts,
  habitSignals,
  regularity,
  resilience,
} from "@/constants/habitSignals";
import { DEFAULT_GOALS, goalFor } from "@/constants/goals";

// Sinais de automaticidade (#285). Nesta fatia nada consome estes números —
// são medição silenciosa pra calibrar limiares depois. Justamente por isso os
// testes são a única rede: um erro aqui não aparece na tela.

const DIA = 86_400_000;

// Base de tempo FIXA, passada explicitamente como `now` em toda chamada.
//
// Sem isso os testes ficam dependentes da hora em que a suíte roda: `em(0, 20)`
// é "hoje às 20:00", que às 15h ainda está no FUTURO — e as funções descartam
// timestamp futuro, então a amostra encolhe e a asserção quebra. Aconteceu de
// verdade: o mesmo teste passou de manhã e falhou à tarde.
//
// 23:30 como hora-base deixa qualquer horário do dia 0 no passado.
const AGORA = new Date(2026, 7, 14, 23, 30, 0, 0).getTime();

/** Timestamp de N dias atrás, no horário HH:MM local, relativo a `AGORA`. */
function em(diasAtras, hh, mm = 0) {
  const d = new Date(AGORA - diasAtras * DIA);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

const reg = (type, createdAt, quantity = 0) => ({ type, createdAt, quantity });

describe("goalFor", () => {
  it("usa a meta do store quando existe", () => {
    expect(goalFor({ water: 3000 }, "water")).toBe(3000);
  });

  it("cai no default quando não há meta salva", () => {
    expect(goalFor({}, "water")).toBe(DEFAULT_GOALS.water);
    expect(goalFor(null, "sleep")).toBe(DEFAULT_GOALS.sleep);
  });

  // Meta zero ou negativa é dado corrompido, não escolha — cair no default é
  // mais seguro que dizer que todo dia bateu a meta.
  it("ignora meta inválida", () => {
    expect(goalFor({ water: 0 }, "water")).toBe(DEFAULT_GOALS.water);
    expect(goalFor({ water: -5 }, "water")).toBe(DEFAULT_GOALS.water);
  });

  it("devolve null pra métrica desconhecida", () => {
    expect(goalFor({}, "abacaxi")).toBeNull();
  });
});

describe("dailyVerdicts", () => {
  it("soma o dia e compara com o alvo", () => {
    const recs = [
      reg("water", em(0, 9), 500),
      reg("water", em(0, 14), 700),
      reg("water", em(0, 20), 900),
    ];
    const v = dailyVerdicts(recs, "water", 2000, 1, AGORA);
    expect(v).toHaveLength(1);
    expect(v[0].total).toBe(2100);
    expect(v[0].hit).toBe(true);
  });

  it("dia abaixo do alvo não conta como hit", () => {
    const v = dailyVerdicts(
      [reg("water", em(0, 9), 500)],
      "water",
      2000,
      1,
      AGORA,
    );
    expect(v[0].hit).toBe(false);
  });

  it("dia sem registro entra na janela como falha", () => {
    const v = dailyVerdicts([], "water", 2000, 3, AGORA);
    expect(v).toHaveLength(3);
    expect(v.every((d) => d.hit === false && d.total === 0)).toBe(true);
  });

  it("ignora registros de outras métricas", () => {
    const recs = [reg("sleep", em(0, 23), 480), reg("water", em(0, 9), 2500)];
    expect(dailyVerdicts(recs, "water", 2000, 1, AGORA)[0].total).toBe(2500);
  });

  // A ordem cronológica não é cosmética: `resilience` depende dela pra saber
  // o que é "dia seguinte". Invertida, ela mede recuperação ao contrário.
  it("devolve do mais antigo pro mais recente", () => {
    const v = dailyVerdicts([], "water", 2000, 3, AGORA);
    expect(v[0].dia < v[1].dia).toBe(true);
    expect(v[1].dia < v[2].dia).toBe(true);
  });

  // Sono é `presence`: o portão é comportamento, não desfecho (§4). Dormir
  // pouco não pode contar como falha de hábito — registrar é o hábito.
  it("sono conta presença, não quantidade", () => {
    const v = dailyVerdicts(
      [reg("sleep", em(0, 23), 60)],
      "sleep",
      480,
      1,
      AGORA,
    );
    expect(v[0].hit).toBe(true);
  });

  it("sono sem registro nenhum é falha", () => {
    expect(dailyVerdicts([], "sleep", 480, 1, AGORA)[0].hit).toBe(false);
  });
});

describe("consistency", () => {
  const v = (...hits) => hits.map((h) => ({ hit: h }));

  it("todos os dias no alvo = 1", () => {
    expect(consistency(v(true, true, true)).rate).toBe(1);
  });

  it("nenhum dia no alvo = 0", () => {
    expect(consistency(v(false, false)).rate).toBe(0);
  });

  it("conta a fração certa", () => {
    const r = consistency(v(true, false, true, true));
    expect(r.rate).toBe(0.75);
    expect(r.hits).toBe(3);
    expect(r.days).toBe(4);
  });

  it("janela vazia não explode", () => {
    expect(consistency([])).toEqual({ rate: 0, hits: 0, days: 0 });
  });
});

describe("regularity", () => {
  // ESTE é o teste que justifica a estatística circular. 23h50 e 00h10 distam
  // 20 minutos. Um desvio-padrão sobre "minutos desde a meia-noite" daria
  // ~700 minutos e diria que a pessoa é caótica — quando ela é quase perfeita.
  // E é exatamente o caso do horário de deitar, o hábito do lvl 1.
  it("horários em volta da meia-noite são regulares, não caóticos", () => {
    const recs = [
      reg("sleep", em(3, 23, 50)),
      reg("sleep", em(2, 0, 10)),
      reg("sleep", em(1, 23, 55)),
      reg("sleep", em(0, 0, 5)),
    ];
    const r = regularity(recs, "sleep", 7, AGORA);
    expect(r.n).toBe(4);
    expect(r.resultant).toBeGreaterThan(0.99);
    expect(r.sdMinutes).toBeLessThan(20);
  });

  it("horário sempre igual = concentração máxima", () => {
    const recs = [0, 1, 2, 3].map((d) => reg("water", em(d, 9, 0)));
    const r = regularity(recs, "water", 7, AGORA);
    expect(r.resultant).toBeCloseTo(1, 5);
    expect(r.sdMinutes).toBeLessThan(1);
  });

  // Espalhado pelas 24h: o vetor médio quase se cancela.
  it("horários espalhados dão dispersão alta", () => {
    const recs = [
      reg("water", em(3, 2)),
      reg("water", em(2, 8)),
      reg("water", em(1, 14)),
      reg("water", em(0, 20)),
    ];
    const r = regularity(recs, "water", 7, AGORA);
    expect(r.resultant).toBeLessThan(0.1);
    expect(r.sdMinutes).toBeGreaterThan(200);
  });

  it("dispersão maior produz sdMinutes maior", () => {
    const apertado = [reg("water", em(1, 9, 0)), reg("water", em(0, 9, 10))];
    const largo = [reg("water", em(1, 7, 0)), reg("water", em(0, 13, 0))];
    expect(regularity(apertado, "water", 7, AGORA).sdMinutes).toBeLessThan(
      regularity(largo, "water", 7, AGORA).sdMinutes,
    );
  });

  // Sem amostra não se afirma nada — null é resposta, 0 seria mentira
  // ("perfeitamente regular").
  it("menos de 2 registros não produz desvio", () => {
    expect(regularity([], "water", 7, AGORA).sdMinutes).toBeNull();
    expect(
      regularity([reg("water", em(0, 9))], "water", 7, AGORA).sdMinutes,
    ).toBeNull();
  });

  it("ignora registros fora da janela", () => {
    const recs = [reg("water", em(30, 9)), reg("water", em(0, 9))];
    expect(regularity(recs, "water", 7, AGORA).n).toBe(1);
  });
});

describe("resilience", () => {
  const v = (...hits) => hits.map((h) => ({ hit: h }));

  // A diferença entre um tropeço e o começo de um hábito novo (§6).
  it("falhou e voltou no dia seguinte = recuperou", () => {
    const r = resilience(v(true, false, true, true));
    expect(r.recovered).toBe(1);
    expect(r.opportunities).toBe(1);
    expect(r.rate).toBe(1);
    expect(r.doubleMisses).toBe(0);
  });

  it("duas faltas seguidas contam como não-recuperação", () => {
    const r = resilience(v(true, false, false, true));
    expect(r.doubleMisses).toBe(1);
    expect(r.rate).toBe(0);
  });

  // Quem nunca caiu não tem taxa de recuperação. 1 seria afirmar resiliência
  // sem evidência; 0 seria puni-la por nunca ter falhado.
  it("sem nenhuma falha, a taxa é null", () => {
    expect(resilience(v(true, true, true)).rate).toBeNull();
  });

  it("falha no último dia da janela não vira oportunidade", () => {
    const r = resilience(v(true, true, false));
    expect(r.opportunities).toBe(0);
    expect(r.rate).toBeNull();
  });

  // Só a falha ISOLADA conta como oportunidade. Nesta sequência:
  //   idx 0 falha — primeira da janela, sem dia anterior: não conta
  //   idx 2 falha após alvo — oportunidade, e o dia seguinte falha: não recuperou
  //   idx 3 falha após falha — não é isolada: não conta
  //   idx 5 falha após alvo — oportunidade, e o dia seguinte acerta: recuperou
  it("mistura de recuperações e recaídas", () => {
    const r = resilience(v(false, true, false, false, true, false, true));
    expect(r.opportunities).toBe(2);
    expect(r.recovered).toBe(1);
    expect(r.doubleMisses).toBe(1);
  });

  // Sem esta distinção, uma recaída longa pontuaria como recuperação assim
  // que acabasse — que é o oposto do que o sinal deve dizer.
  it("recaída longa não vira recuperação quando enfim acaba", () => {
    const r = resilience(v(true, false, false, false, true));
    expect(r.opportunities).toBe(1);
    expect(r.recovered).toBe(0);
    expect(r.rate).toBe(0);
    expect(r.doubleMisses).toBe(2);
  });

  // Falha logo no início da janela: não dá pra saber se era isolada ou meio
  // de uma sequência que começou antes.
  it("falha no primeiro dia da janela não conta como oportunidade", () => {
    const r = resilience(v(false, true, true));
    expect(r.opportunities).toBe(0);
    expect(r.rate).toBeNull();
  });
});

describe("habitSignals", () => {
  it("junta os três sinais numa chamada", () => {
    const recs = [reg("water", em(1, 9), 2500), reg("water", em(0, 9), 2500)];
    const s = habitSignals(recs, "water", 2000, 7, AGORA);
    expect(s.metric).toBe("water");
    expect(s.days).toBe(7);
    expect(s.consistency.hits).toBe(2);
    expect(s.regularity.n).toBe(2);
    expect(s.resilience).toHaveProperty("doubleMisses");
  });
});
