// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Plano de remédios (#392, fatia 3b): cifrado, o dia com o "tomei", e os
// avisos no horário.
//
// As marcas aqui são LINHAS CRUAS do `useTable`, com o `protegido` preso no
// `details`, que é o formato que o hook recebe no app (#356).

import { createKeyBundle } from "@/constants/e2e";
import {
  cifrarRemedio,
  lerRemedio,
  marcasDoPlano,
  medReminderSchedule,
  medReminderText,
  normalizarHorarios,
  planoDoDia,
  remediosDaTabela,
} from "@/constants/medPlan";
import { cifrarRegistro, lerRegistro } from "@/constants/selfcare";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };
const em = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();

let chave, chaves;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

/** Tabela `meds` com os remédios dados, na ordem. */
const tabela = (...remedios) =>
  Object.fromEntries(
    remedios.map((r, i) => [
      r.id,
      { protegido: cifrarRemedio(chave, r), createdAt: i + 1 },
    ]),
  );

/** "Tomei" de um horário, registrado no dia `d` às `h`, como linha crua. */
const tomei = (d, h, remedio) => ({
  type: "selfcare",
  date: new Date(em(d, h)).toISOString(),
  quantity: 1,
  unit: "registro",
  note: "",
  createdAt: em(d, h),
  details: JSON.stringify({
    protegido: cifrarRegistro(chave, { tipo: "remedio", remedio }),
  }),
});

const sertralina = { id: "s", nome: "Sertralina 50mg", horarios: ["08:00"] };
const vitamina = { id: "v", nome: "Vitamina D", horarios: ["20:00", "08:00"] };

describe("o plano vai cifrado", () => {
  it("nome e horários não aparecem no campo", () => {
    const protegido = cifrarRemedio(chave, sertralina);
    expect(protegido).not.toMatch(/Sertralina|50mg|08:00/);
  });

  it("volta com nome e horários, em ordem e sem repetição", () => {
    const linha = {
      protegido: cifrarRemedio(chave, {
        nome: "  Vitamina D ",
        horarios: ["20:00", "8:00", "20:00", "lixo"],
      }),
    };
    expect(lerRemedio(chaves, linha)).toEqual({
      estado: "aberto",
      nome: "Vitamina D",
      horarios: ["08:00", "20:00"],
    });
  });

  it("sem nome ou sem horário válido é recusado antes de cifrar", () => {
    expect(() =>
      cifrarRemedio(chave, { nome: " ", horarios: ["08:00"] }),
    ).toThrow();
    expect(() =>
      cifrarRemedio(chave, { nome: "x", horarios: ["25:00"] }),
    ).toThrow();
  });

  it("sem a chave destrancada: travado", () => {
    const linha = { protegido: cifrarRemedio(chave, sertralina) };
    expect(lerRemedio({}, linha)).toEqual({ estado: "travado" });
  });

  it("normaliza horários", () => {
    expect(normalizarHorarios(["8:05", "", "07:30", "08:05"])).toEqual([
      "07:30",
      "08:05",
    ]);
  });
});

describe("o tomei leva o remédio dentro do registro", () => {
  it("o histórico lê nome e horário, e o servidor não", () => {
    const protegido = cifrarRegistro(chave, {
      tipo: "remedio",
      remedio: { id: "s", nome: "Sertralina 50mg", horario: "08:00" },
    });
    expect(protegido).not.toMatch(/Sertralina|08:00/);
    expect(lerRegistro(chaves, { protegido })).toEqual({
      estado: "aberto",
      tipo: "remedio",
      nota: "",
      remedio: { id: "s", nome: "Sertralina 50mg", horario: "08:00" },
    });
  });

  it("marca do plano só em registro de remédio", () => {
    expect(() =>
      cifrarRegistro(chave, {
        tipo: "terapia",
        remedio: { id: "s", nome: "x", horario: "08:00" },
      }),
    ).toThrow();
  });
});

describe("o dia", () => {
  it("um item por horário, em ordem de horário, com o tomei de hoje", () => {
    const remedios = remediosDaTabela(chaves, tabela(sertralina, vitamina));
    const marcas = marcasDoPlano(chaves, {
      r1: tomei(20, 8, { id: "s", nome: "Sertralina 50mg", horario: "08:00" }),
      // De ontem: não marca o de hoje.
      r2: tomei(19, 20, { id: "v", nome: "Vitamina D", horario: "20:00" }),
    });
    const dia = planoDoDia(remedios, marcas, "2026-10-20");
    expect(dia.map((i) => [i.horario, i.nome, i.marca])).toEqual([
      ["08:00", "Sertralina 50mg", "r1"],
      ["08:00", "Vitamina D", null],
      ["20:00", "Vitamina D", null],
    ]);
  });

  it("registro avulso de autocuidado não é marca do plano", () => {
    const avulso = {
      type: "selfcare",
      date: new Date(em(20, 9)).toISOString(),
      createdAt: em(20, 9),
      details: JSON.stringify({
        protegido: cifrarRegistro(chave, { tipo: "remedio", nota: "x" }),
      }),
    };
    expect(marcasDoPlano(chaves, { a: avulso })).toEqual([]);
  });

  it("remédio que não abre fica fora do dia, e não some do plano", () => {
    const remedios = remediosDaTabela({}, tabela(sertralina));
    expect(remedios.map((r) => r.estado)).toEqual(["travado"]);
    expect(planoDoDia(remedios, [], "2026-10-20")).toEqual([]);
  });
});

describe("os avisos", () => {
  const quando = (ms) => {
    const d = new Date(ms);
    return [d.getDate(), d.getHours(), d.getMinutes()];
  };

  it("cada horário, nos próximos dias", () => {
    const agenda = medReminderSchedule({
      remedios: remediosDaTabela(chaves, tabela(vitamina)),
      marcas: [],
      enabled: true,
      dias: 2,
      now: em(20, 12),
    });
    expect(agenda.map((a) => quando(a.at))).toEqual([
      [20, 20, 0],
      [21, 8, 0],
      [21, 20, 0],
      [22, 8, 0],
    ]);
  });

  it("horário com tomei não é avisado", () => {
    const marcas = marcasDoPlano(chaves, {
      r1: tomei(20, 7, { id: "s", nome: "Sertralina 50mg", horario: "08:00" }),
    });
    const agenda = medReminderSchedule({
      remedios: remediosDaTabela(chaves, tabela(sertralina)),
      marcas,
      enabled: true,
      dias: 2,
      now: em(20, 7, 30),
    });
    expect(agenda.map((a) => quando(a.at))).toEqual([
      [21, 8, 0],
      [22, 8, 0],
    ]);
  });

  it("desligado ou travado, nada", () => {
    const base = { marcas: [], dias: 2, now: em(20, 12) };
    expect(
      medReminderSchedule({
        ...base,
        remedios: remediosDaTabela(chaves, tabela(sertralina)),
        enabled: false,
      }),
    ).toEqual([]);
    expect(
      medReminderSchedule({
        ...base,
        remedios: remediosDaTabela({}, tabela(sertralina)),
        enabled: true,
      }),
    ).toEqual([]);
  });

  it("o texto não diz o remédio, porque aparece na tela de bloqueio", () => {
    const { title, body } = medReminderText();
    expect(`${title} ${body}`).not.toMatch(/rem[eé]dio/i);
    expect(body).toBe("Hora do seu cuidado.");
  });
});
