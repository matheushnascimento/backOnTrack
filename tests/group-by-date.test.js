// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)

// `groupByDate` pura (#330).
//
// A Home assinava `records` pelo useTable e mesmo assim lia a store por fora,
// dentro do memo. O que aparecia dependia de QUANDO a leitura acontecia em
// relação à assinatura. O sintoma: editar a duração de um sono de hoje não
// mudava o valor na Home, e sair da tela e voltar corrigia.
//
// ⚠️ Estes testes provam que a função é pura e correta. Eles **não** provam
// que o sintoma sumiu: nunca consegui reproduzi-lo no jest, e por isso a
// confirmação depende de rodar no aparelho.

import { groupByDate } from "../infra/database";

const linha = (type, date, quantity, extras = {}) => ({
  type,
  date,
  quantity,
  unit: "",
  note: "",
  details: JSON.stringify(extras),
  createdAt: Date.parse(date),
});

const HOJE = "2026-09-11T12:00:00.000Z";

describe("groupByDate", () => {
  it("agrupa por tipo só o que é do dia alvo", () => {
    const t = {
      a: linha("water", "2026-09-11T09:00:00.000Z", 200),
      b: linha("water", "2026-09-11T15:00:00.000Z", 300),
      c: linha("sleep", "2026-09-11T06:00:00.000Z", 480),
      d: linha("water", "2026-09-10T09:00:00.000Z", 999),
    };
    const r = groupByDate(t, HOJE);
    expect(r.water).toHaveLength(2);
    expect(r.sleep).toHaveLength(1);
    expect(r.water.map((x) => x.quantity)).not.toContain(999);
  });

  it("reflete o valor que está na tabela recebida", () => {
    // O ponto da mudança: o resultado vem do argumento, e não de uma leitura
    // própria da store. Duas tabelas diferentes dão dois resultados, sem
    // qualquer estado escondido entre as chamadas.
    const antes = { a: linha("sleep", HOJE, 480) };
    const depois = { a: linha("sleep", HOJE, 300) };
    expect(groupByDate(antes, HOJE).sleep[0].quantity).toBe(480);
    expect(groupByDate(depois, HOJE).sleep[0].quantity).toBe(300);
  });

  it("não muda a tabela que recebe", () => {
    const t = { a: linha("water", HOJE, 200) };
    const copia = JSON.parse(JSON.stringify(t));
    groupByDate(t, HOJE);
    expect(t).toEqual(copia);
  });

  it("mantém a ordem do mais recente primeiro (#314)", () => {
    const t = {
      a: linha("water", "2026-09-11T08:00:00.000Z", 100),
      b: linha("water", "2026-09-11T20:00:00.000Z", 300),
      c: linha("water", "2026-09-11T14:00:00.000Z", 200),
    };
    expect(groupByDate(t, HOJE).water.map((x) => x.quantity)).toEqual([
      300, 200, 100,
    ]);
  });

  it("hidrata os extras do details", () => {
    const t = { a: linha("sleep", HOJE, 440, { bed: "23:40", wake: "07:00" }) };
    expect(groupByDate(t, HOJE).sleep[0].bed).toBe("23:40");
  });

  it("tolera tabela vazia e registro sem data", () => {
    expect(groupByDate({}, HOJE)).toEqual({});
    expect(groupByDate({ a: linha("water", "", 200) }, HOJE)).toEqual({});
  });
});
