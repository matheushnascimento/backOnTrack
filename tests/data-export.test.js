// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Exportação dos dados (#429): o JSON leva tudo aberto quando dá, nunca leva
// texto cifrado, e diz o que ficou de fora. O CSV abre no Excel em pt-BR.
//
// Os registros são LINHAS CRUAS do `useTable`, com o `protegido` preso no
// `details`, que é o que a tela entrega.

import { cifrarPeso } from "@/constants/bodyWeight";
import {
  CABECALHO_CSV,
  campoCsv,
  montarExportacao,
  nomeDoArquivo,
  paraCsv,
  paraJson,
} from "@/constants/dataExport";
import { createKeyBundle } from "@/constants/e2e";
import { cifrarRemedio } from "@/constants/medPlan";
import { cifrarRegistro } from "@/constants/selfcare";
import { cifrarMetas } from "@/constants/selfcareGoals";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };
const em = (d, h = 9, m = 0) => new Date(2026, 10, d, h, m).getTime();
const AGORA = em(12, 20);

let chave, chaves;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

const linha = (type, d, h, campos = {}, extras = {}) => ({
  type,
  date: new Date(em(d, h)).toISOString(),
  quantity: 0,
  unit: "",
  note: "",
  createdAt: em(d, h),
  details: JSON.stringify(extras),
  ...campos,
});

/** Um store com um pouco de tudo, como o de quem usa o app. */
function dadosCompletos() {
  const sertralina = cifrarRemedio(chave, {
    nome: "Sertralina",
    horarios: ["08:00"],
  });
  return {
    tabelas: {
      records: {
        a: linha("water", 10, 8, { quantity: 250, unit: "ml" }),
        b: linha(
          "sleep",
          10,
          7,
          { quantity: 450, unit: "min" },
          { bed: "23:30" },
        ),
        c: linha(
          "selfcare",
          11,
          9,
          { quantity: 1, unit: "registro" },
          {
            protegido: cifrarRegistro(chave, {
              tipo: "terapia",
              nota: "sessão; boa",
            }),
          },
        ),
        d: linha("feeding", 11, 12, {
          quantity: 1,
          unit: "refeição",
          note: 'almoço "leve"',
        }),
        e: linha("exercise", 11, 18, { quantity: 30.5, unit: "min" }),
      },
      goals: { water: { target: 2000, updatedAt: 1 } },
      meds: { m1: { protegido: sertralina, createdAt: 5 } },
      hygieneSteps: { 10: { startedAt: em(1), conqueredAt: em(9) } },
    },
    valores: {
      displayName: "Ana",
      selfcareGoals: cifrarMetas(chave, {
        terapia: { vezes: 1, periodo: "semana" },
      }),
      bodyWeight: cifrarPeso(chave, 72.5),
      hygieneTarget: "23:00",
    },
  };
}

const exportar = (dados, comChaves) =>
  montarExportacao({ ...dados, chaves: comChaves, agora: AGORA });

/** Nenhum valor de texto do objeto é campo cifrado. */
function semCifra(objeto) {
  const texto = JSON.stringify(objeto);
  expect(texto).not.toContain("protegido");
  expect(texto).not.toMatch(/e2e\d:/);
}

describe("destravado", () => {
  it("leva tudo aberto, e nada fica de fora", () => {
    const out = exportar(dadosCompletos(), chaves);
    expect(out.formato).toBe("backontrack-export");
    expect(out.versao).toBe(1);
    expect(out.geradoEm).toBe(new Date(AGORA).toISOString());
    expect(out.omitidos).toEqual([]);
    expect(out.registros).toHaveLength(5);
    expect(out.metas).toEqual({ water: 2000 });
    expect(out.remedios).toEqual([
      { id: "m1", nome: "Sertralina", horarios: ["08:00"], createdAt: 5 },
    ]);
    expect(out.metasAutocuidado).toEqual({
      terapia: { vezes: 1, periodo: "semana" },
    });
    expect(out.peso).toEqual({ kg: 72.5 });
    expect(out.higiene).toEqual({
      alvo: "23:00",
      degraus: [{ regra: "10", startedAt: em(1), conqueredAt: em(9) }],
    });
    expect(out.nome).toBe("Ana");
    semCifra(out);
  });

  it("registros hidratados, em ordem de tempo, com o autocuidado aberto", () => {
    const { registros } = exportar(dadosCompletos(), chaves);
    expect(registros.map((r) => r.id)).toEqual(["b", "a", "c", "d", "e"]);
    expect(registros[0]).toMatchObject({ type: "sleep", bed: "23:30" });
    expect(registros[0].details).toBeUndefined();
    expect(registros[2].autocuidado).toEqual({
      tipo: "terapia",
      nota: "sessão; boa",
    });
  });
});

describe("travado", () => {
  it("omite o cifrado, lista cada um, e não leva texto cifrado", () => {
    const out = exportar(dadosCompletos(), {});
    expect(out.registros).toHaveLength(5);
    expect(out.registros.find((r) => r.id === "c").autocuidado).toBeUndefined();
    expect(out.remedios).toEqual([]);
    expect(out.metasAutocuidado).toBeNull();
    expect(out.peso).toBeNull();
    expect(
      out.omitidos.map(({ item, motivo, quantidade }) => [
        item,
        motivo,
        quantidade,
      ]),
    ).toEqual([
      ["autocuidado", "travado", 1],
      ["remedios", "travado", 1],
      ["metasAutocuidado", "travado", 1],
      ["peso", "travado", 1],
    ]);
    for (const o of out.omitidos) expect(o.descricao).toBeTruthy();
    semCifra(out);
  });

  it("o que não é cifrado sai igual", () => {
    const out = exportar(dadosCompletos(), {});
    expect(out.metas).toEqual({ water: 2000 });
    expect(out.higiene.alvo).toBe("23:00");
    expect(out.nome).toBe("Ana");
  });
});

describe("sem proteção", () => {
  it("nada cifrado: exporta o que existe e nada fica de fora", () => {
    const dados = dadosCompletos();
    delete dados.tabelas.records.c;
    dados.tabelas.meds = {};
    dados.valores.selfcareGoals = "";
    dados.valores.bodyWeight = "";
    const out = exportar(dados, {});
    expect(out.omitidos).toEqual([]);
    expect(out.registros).toHaveLength(4);
    expect(out.metasAutocuidado).toEqual({});
    expect(out.peso).toBeNull();
  });
});

describe("ilegível", () => {
  it("campo que não decifra com a chave é omitido e contado", () => {
    const dados = dadosCompletos();
    // Cifrado com a chave certa, mas pra outro campo: o contexto não fecha.
    const doPeso = cifrarPeso(chave, 70);
    dados.tabelas.records.f = linha(
      "selfcare",
      12,
      8,
      {},
      { protegido: doPeso },
    );
    dados.tabelas.records.g = linha(
      "selfcare",
      12,
      9,
      {},
      { protegido: doPeso },
    );
    dados.valores.selfcareGoals = doPeso;
    const out = exportar(dados, chaves);
    expect(out.omitidos).toEqual([
      expect.objectContaining({
        item: "autocuidado",
        motivo: "ilegivel",
        quantidade: 2,
      }),
      expect.objectContaining({
        item: "metasAutocuidado",
        motivo: "ilegivel",
        quantidade: 1,
      }),
    ]);
    expect(out.metasAutocuidado).toBeNull();
    semCifra(out);
  });
});

describe("store vazio", () => {
  it("JSON com listas vazias e CSV só com o cabeçalho", () => {
    const out = montarExportacao({
      tabelas: {},
      valores: {},
      chaves: {},
      agora: AGORA,
    });
    expect(out.registros).toEqual([]);
    expect(out.remedios).toEqual([]);
    expect(out.metas).toEqual({});
    expect(out.higiene).toEqual({ alvo: "", degraus: [] });
    expect(out.omitidos).toEqual([]);
    expect(paraCsv(out)).toBe(`\uFEFF${CABECALHO_CSV.join(";")}\r\n`);
    expect(JSON.parse(paraJson(out))).toEqual(out);
  });
});

describe("CSV", () => {
  const csv = () => paraCsv(exportar(dadosCompletos(), chaves));
  const linhas = () =>
    csv()
      .replace(/^\uFEFF/, "")
      .split("\r\n");

  it("começa com o BOM e o cabeçalho, separado por ponto e vírgula", () => {
    expect(
      csv().startsWith(
        "\uFEFFdata;hora;habito;quantidade;unidade;nota;detalhes\r\n",
      ),
    ).toBe(true);
  });

  it("uma linha por registro, com data e hora locais e o hábito em pt-BR", () => {
    const l = linhas();
    expect(l).toHaveLength(1 + 5 + 1); // cabeçalho, registros, linha final vazia
    expect(l[1]).toBe('10/11/2026;07:00;sono;450;min;;"{""bed"":""23:30""}"');
    expect(l[2]).toBe("10/11/2026;08:00;água;250;ml;;");
  });

  it("decimal com vírgula", () => {
    expect(linhas()[5]).toBe("11/11/2026;18:00;exercício;30,5;min;;");
  });

  it("aspas dobradas no campo com aspas", () => {
    expect(linhas()[4]).toBe(
      '11/11/2026;12:00;alimentação;1;refeição;"almoço ""leve""";',
    );
  });

  it("autocuidado com tipo e nota abertos no detalhes", () => {
    expect(linhas()[3]).toBe(
      '11/11/2026;09:00;autocuidado;1;registro;;"{""autocuidado"":{""tipo"":""terapia"",""nota"":""sessão; boa""}}"',
    );
  });

  it("travado, o autocuidado sai sem detalhes e sem cifra", () => {
    const texto = paraCsv(exportar(dadosCompletos(), {}));
    expect(texto).toContain("11/11/2026;09:00;autocuidado;1;registro;;\r\n");
    expect(texto).not.toMatch(/protegido|e2e\d:/);
  });

  it("a hora vem do createdAt, que é a que a correção de hora mexe", () => {
    const out = exportar(
      {
        tabelas: {
          records: {
            a: linha("water", 10, 8, { createdAt: em(10, 14, 5), quantity: 1 }),
          },
        },
        valores: {},
      },
      {},
    );
    expect(paraCsv(out).split("\r\n")[1]).toBe("10/11/2026;14:05;água;1;;;");
  });

  it("hora corrigida reordena o registro dentro do dia", () => {
    // `a` foi lançado às 8h e corrigido pra 14h05: o `setRecordTime` só mexe
    // no `createdAt`, e a `date` segue às 8h. Tem que vir depois de `b`, 12h.
    const out = exportar(
      {
        tabelas: {
          records: {
            a: linha("water", 10, 8, { createdAt: em(10, 14, 5), quantity: 1 }),
            b: linha("water", 10, 12, { quantity: 2 }),
            c: linha("water", 9, 23, { quantity: 3 }),
          },
        },
        valores: {},
      },
      {},
    );
    expect(out.registros.map((r) => r.id)).toEqual(["c", "b", "a"]);
    const l = paraCsv(out).split("\r\n");
    expect(l[2]).toBe("10/11/2026;12:00;água;2;;;");
    expect(l[3]).toBe("10/11/2026;14:05;água;1;;;");
  });

  it("nota que começa com - ou = sai como texto, sem virar fórmula", () => {
    const out = exportar(
      {
        tabelas: {
          records: {
            a: linha("water", 10, 8, { note: "- dor de cabeça", quantity: -1 }),
            b: linha("water", 10, 9, { note: "=1+1", unit: "+ml" }),
          },
        },
        valores: {},
      },
      {},
    );
    const l = paraCsv(out).split("\r\n");
    // Número fica como número, mesmo negativo.
    expect(l[1]).toBe("10/11/2026;08:00;água;-1;;'- dor de cabeça;");
    expect(l[2]).toBe("10/11/2026;09:00;água;0;'+ml;'=1+1;");
  });

  it("aspas em campo com separador, aspas ou quebra de linha", () => {
    expect(campoCsv("a;b")).toBe('"a;b"');
    expect(campoCsv('a"b')).toBe('"a""b"');
    expect(campoCsv("a\nb")).toBe('"a\nb"');
    expect(campoCsv("ação")).toBe("ação");
    expect(campoCsv(null)).toBe("");
  });
});

describe("nome do arquivo", () => {
  it("leva o dia local", () => {
    expect(nomeDoArquivo(AGORA, "json")).toBe("backontrack-2026-11-12.json");
    expect(nomeDoArquivo(AGORA, "csv")).toBe("backontrack-2026-11-12.csv");
  });
});
