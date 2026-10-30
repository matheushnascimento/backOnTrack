// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Metas por tipo do autocuidado (#395): cifradas, por dia ou por semana, e a
// semana são os últimos 7 dias.
//
// Os registros aqui são LINHAS CRUAS do `useTable`, com o `protegido` preso
// no `details`, que é o formato que o hook recebe no app (#356).

import { createKeyBundle } from "@/constants/e2e";
import { cifrarRegistro } from "@/constants/selfcare";
import {
  cifrarMetas,
  lerMetas,
  normalizarMetas,
  progressoDasMetas,
  resumoDasMetas,
  textoDoProgresso,
} from "@/constants/selfcareGoals";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };
const em = (d, h = 9) => new Date(2026, 9, d, h).getTime();

let chave, chaves;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

/** Registro de autocuidado do tipo dado no dia `d`, como linha crua. */
const registro = (tipo, d, h = 9) => ({
  type: "selfcare",
  date: new Date(em(d, h)).toISOString(),
  quantity: 1,
  unit: "registro",
  note: "",
  createdAt: em(d, h),
  details: JSON.stringify({ protegido: cifrarRegistro(chave, { tipo }) }),
});

const tabela = (...linhas) =>
  Object.fromEntries(linhas.map((l, i) => [`r${i}`, l]));

describe("a configuração vai cifrada", () => {
  it("tipo e meta não aparecem no campo", () => {
    const protegido = cifrarMetas(chave, {
      terapia: { vezes: 1, periodo: "semana" },
    });
    expect(protegido).not.toMatch(/terapia|semana/);
    expect(lerMetas(chaves, protegido)).toEqual({
      estado: "aberto",
      metas: { terapia: { vezes: 1, periodo: "semana" } },
    });
  });

  it("sem a chave destrancada: travado", () => {
    const protegido = cifrarMetas(chave, {
      skincare: { vezes: 1, periodo: "dia" },
    });
    expect(lerMetas({}, protegido)).toEqual({ estado: "travado" });
  });

  it("nada configurado é aberto e vazio, e tirar todas volta a vazio", () => {
    expect(lerMetas({}, "")).toEqual({ estado: "aberto", metas: {} });
    expect(cifrarMetas(chave, {})).toBe("");
  });

  it("remédio fica com o plano, e vezes fora do teto é cortada", () => {
    expect(
      normalizarMetas({
        remedio: { vezes: 2, periodo: "dia" },
        skincare: { vezes: 40, periodo: "dia" },
        terapia: { vezes: 0, periodo: "semana" },
        outro: { vezes: 2, periodo: "mes" },
      }),
    ).toEqual({ skincare: { vezes: 5, periodo: "dia" } });
  });
});

describe("o progresso", () => {
  it("por semana conta os últimos 7 dias, contando hoje", () => {
    const metas = { terapia: { vezes: 1, periodo: "semana" } };
    // Hoje é 30. A terapia do dia 24 conta; a do dia 23 já saiu da janela.
    const registros = tabela(registro("terapia", 23), registro("terapia", 24));
    const [p] = progressoDasMetas(chaves, metas, registros, em(30, 20));
    expect(p).toEqual({
      tipo: "terapia",
      periodo: "semana",
      vezes: 1,
      feitas: 1,
      cumprida: true,
    });
    expect(textoDoProgresso(p)).toBe("1 de 1 nos últimos 7 dias");
  });

  it("por dia conta hoje e os dias da semana que bateram", () => {
    const metas = { skincare: { vezes: 2, periodo: "dia" } };
    const registros = tabela(
      registro("skincare", 28, 8),
      registro("skincare", 28, 22),
      registro("skincare", 29, 8),
      registro("skincare", 30, 8),
    );
    const [p] = progressoDasMetas(chaves, metas, registros, em(30, 20));
    expect(p).toEqual({
      tipo: "skincare",
      periodo: "dia",
      vezes: 2,
      hoje: 1,
      cumprida: false,
      diasCumpridos: 1,
    });
    expect(textoDoProgresso(p)).toBe("hoje 1 de 2 · 1 dia na semana");
  });

  it("só os tipos escolhidos, na ordem da tela, e outros tipos não contam", () => {
    const metas = {
      outro: { vezes: 1, periodo: "semana" },
      skincare: { vezes: 1, periodo: "dia" },
    };
    const registros = tabela(
      registro("skincare", 30),
      registro("terapia", 30),
      registro("remedio", 30),
    );
    const progresso = progressoDasMetas(chaves, metas, registros, em(30, 20));
    expect(progresso.map((p) => p.tipo)).toEqual(["skincare", "outro"]);
    expect(resumoDasMetas(progresso)).toBe("skincare 1/1 · outro 0/1");
  });

  it("registro que não abre não conta", () => {
    const metas = { terapia: { vezes: 1, periodo: "semana" } };
    const [p] = progressoDasMetas(
      {},
      metas,
      tabela(registro("terapia", 30)),
      em(30, 20),
    );
    expect(p.feitas).toBe(0);
  });

  it("sem metas, a Home fica com a contagem de sempre", () => {
    expect(resumoDasMetas([])).toBeNull();
  });
});
