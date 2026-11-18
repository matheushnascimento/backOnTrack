// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// A tela da exportação (#429): os botões entregam o arquivo com o nome e o
// tipo certos, a proteção travada é avisada antes de exportar, e a falha
// aparece na tela.

import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack } from "expo-router";
import { Text } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockSalvar = jest.fn();
jest.mock("@/infra/exportFile", () => ({
  salvarECompartilhar: (...args) => mockSalvar(...args),
}));

const mockProtecao = { status: "destravado", chaves: {} };
jest.mock("@/infra/useProtection", () => ({
  useProtection: () => mockProtecao,
}));

import { createKeyBundle } from "@/constants/e2e";
import { cifrarPeso } from "@/constants/bodyWeight";
import { cifrarRegistro } from "@/constants/selfcare";
import { store } from "@/infra/database";

const opcoes = { kdf: { alg: "pbkdf2-sha256", c: 1000 } };
let chave, chaves;
beforeAll(async () => {
  const a = await createKeyBundle("x", opcoes);
  chave = { kid: a.bundle.kid, dataKey: a.dataKey };
  chaves = { [chave.kid]: chave.dataKey };
});

const hoje = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

beforeEach(() => {
  store.delTables();
  store.delValues();
  store.setRow("records", "a", {
    type: "water",
    date: new Date().toISOString(),
    quantity: 250,
    unit: "ml",
    note: "",
    details: "{}",
    createdAt: Date.now(),
  });
  store.setRow("records", "b", {
    type: "selfcare",
    date: new Date().toISOString(),
    quantity: 1,
    unit: "registro",
    note: "",
    details: JSON.stringify({
      protegido: cifrarRegistro(chave, { tipo: "terapia" }),
    }),
    createdAt: Date.now(),
  });
  store.setValue("bodyWeight", cifrarPeso(chave, 70));
  mockProtecao.status = "destravado";
  mockProtecao.chaves = chaves;
  mockSalvar.mockReset();
  mockSalvar.mockResolvedValue(undefined);
});

async function abrir() {
  const Export = require("@/app/export").default;
  return renderRouter({
    _layout: () => <Stack screenOptions={{ headerShown: false }} />,
    index: Export,
    protecao: () => <Text>tela da proteção</Text>,
  });
}

describe("botões", () => {
  it("Exportar JSON entrega o arquivo do dia, aberto", async () => {
    const tela = await abrir();
    await fireEvent.press(tela.getByLabelText("Exportar JSON"));
    await waitFor(() => expect(mockSalvar).toHaveBeenCalledTimes(1));
    const { nome, mimeType, conteudo } = mockSalvar.mock.calls[0][0];
    expect(nome).toBe(`backontrack-${hoje()}.json`);
    expect(mimeType).toBe("application/json");
    const json = JSON.parse(conteudo);
    expect(json.registros).toHaveLength(2);
    expect(json.peso).toEqual({ kg: 70 });
    expect(conteudo).not.toContain("protegido");
  });

  it("Exportar CSV entrega o CSV com BOM", async () => {
    const tela = await abrir();
    await fireEvent.press(tela.getByLabelText("Exportar CSV"));
    await waitFor(() => expect(mockSalvar).toHaveBeenCalledTimes(1));
    const { nome, mimeType, conteudo } = mockSalvar.mock.calls[0][0];
    expect(nome).toBe(`backontrack-${hoje()}.csv`);
    expect(mimeType).toBe("text/csv");
    expect(conteudo.startsWith("\uFEFFdata;hora;habito;")).toBe(true);
    expect(conteudo).toContain("terapia");
  });

  it("destravado, nenhum aviso", async () => {
    const tela = await abrir();
    expect(tela.queryByText("O que vai ficar de fora")).toBeNull();
    expect(tela.getByText(/2 registros/)).toBeTruthy();
  });
});

describe("proteção travada", () => {
  it("diz o que fica de fora antes de exportar, e leva à proteção", async () => {
    mockProtecao.status = "travado";
    mockProtecao.chaves = {};
    const tela = await abrir();
    expect(tela.getByText("O que vai ficar de fora")).toBeTruthy();
    expect(
      tela.getByText(/tipo e nota dos registros do autocuidado \(1\)/),
    ).toBeTruthy();
    expect(tela.getByText(/· peso/)).toBeTruthy();
    expect(mockSalvar).not.toHaveBeenCalled();

    await fireEvent.press(tela.getByLabelText("Abrir a proteção"));
    expect(await tela.findByText("tela da proteção")).toBeTruthy();
  });

  it("o arquivo exportado não leva o cifrado", async () => {
    mockProtecao.status = "travado";
    mockProtecao.chaves = {};
    const tela = await abrir();
    await fireEvent.press(tela.getByLabelText("Exportar JSON"));
    await waitFor(() => expect(mockSalvar).toHaveBeenCalledTimes(1));
    const json = JSON.parse(mockSalvar.mock.calls[0][0].conteudo);
    expect(json.peso).toBeNull();
    expect(json.omitidos.map((o) => o.item)).toEqual(["autocuidado", "peso"]);
    expect(mockSalvar.mock.calls[0][0].conteudo).not.toMatch(/e2e1:/);
  });
});

describe("item travado com a proteção destravada", () => {
  it("o aviso segue o motivo do item, e oferece destravar", async () => {
    // Registro cifrado com uma segunda chave, que este aparelho não abriu.
    const outra = await createKeyBundle("y", opcoes);
    store.setRow("records", "c", {
      type: "selfcare",
      date: new Date().toISOString(),
      quantity: 1,
      unit: "registro",
      note: "",
      details: JSON.stringify({
        protegido: cifrarRegistro(
          { kid: outra.bundle.kid, dataKey: outra.dataKey },
          { tipo: "skincare" },
        ),
      }),
      createdAt: Date.now(),
    });
    mockProtecao.status = "destravado";
    const tela = await abrir();
    expect(tela.getByText("O que vai ficar de fora")).toBeTruthy();
    expect(tela.getByText(/só saem abertos com a proteção/)).toBeTruthy();
    expect(tela.queryByText(/não abriram com a chave/)).toBeNull();
    expect(tela.getByLabelText("Abrir a proteção")).toBeTruthy();
  });
});

describe("falha", () => {
  it("compartilhar indisponível vira mensagem, e os dados ficam", async () => {
    mockSalvar.mockRejectedValue(
      Object.assign(new Error("x"), { code: "sem-compartilhar" }),
    );
    jest.spyOn(console, "error").mockImplementation(() => {});
    const tela = await abrir();
    await fireEvent.press(tela.getByLabelText("Exportar CSV"));
    expect(await tela.findByText(/não abriu o compartilhamento/)).toBeTruthy();
    expect(store.getRowIds("records")).toEqual(["a", "b"]);
  });

  it("erro de escrita vira mensagem", async () => {
    mockSalvar.mockRejectedValue(new Error("disco cheio"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const tela = await abrir();
    await fireEvent.press(tela.getByLabelText("Exportar JSON"));
    expect(await tela.findByText(/Não deu pra gerar o arquivo/)).toBeTruthy();
  });
});

describe("Ajustes → Exportar dados", () => {
  // A tela só existe pra pessoa se a linha de Ajustes levar até ela.
  it("a linha abre a tela, e o botão exporta", async () => {
    const Ajustes = require("@/app/ajustes").default;
    const Export = require("@/app/export").default;
    const tela = await renderRouter({
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: Ajustes,
      export: Export,
    });
    await fireEvent.press(tela.getByLabelText("App"));
    await fireEvent.press(tela.getByLabelText("Exportar dados"));
    // Na tela da exportação (Ajustes não tem este botão).
    await fireEvent.press(tela.getByLabelText("Exportar JSON"));
    await waitFor(() => expect(mockSalvar).toHaveBeenCalledTimes(1));
    expect(mockSalvar.mock.calls[0][0].nome).toBe(`backontrack-${hoje()}.json`);
  });
});
