// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// A edição de meta na tela (#423): o modal grava, o peso sugere a água, e a
// tela da água passa a ler a meta salva.

import { act, fireEvent, render } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack } from "expo-router";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockPeso = { protecao: "destravado", kg: null, salvar: jest.fn() };
jest.mock("@/infra/useBodyWeight", () => ({
  useBodyWeight: () => mockPeso,
}));

import GoalEditModal from "@/components/GoalEditModal";
import WaterQuickAdd from "@/components/metrics/WaterQuickAdd";
import { ensureGoals, getGoals, setGoal, store } from "@/infra/database";

beforeEach(() => {
  store.delTables();
  ensureGoals();
  mockPeso.protecao = "destravado";
  mockPeso.kg = null;
  mockPeso.salvar = jest.fn(() => true);
});

async function abrir(metric, label, onClose = jest.fn()) {
  const tela = await render(
    <GoalEditModal
      metric={metric}
      label={label}
      current={getGoals()[metric]}
      onClose={onClose}
    />,
  );
  return { tela, onClose };
}

describe("modal da meta", () => {
  it("salva a meta digitada e fecha", async () => {
    const { tela, onClose } = await abrir("study", "Estudo");
    await fireEvent.changeText(tela.getByLabelText("Meta de estudo"), "45");
    await fireEvent.press(tela.getByLabelText("Salvar meta"));
    expect(getGoals().study).toBe(45);
    expect(onClose).toHaveBeenCalled();
  });

  it("valor fora dos limites não salva", async () => {
    const { tela, onClose } = await abrir("feeding", "Alimentação");
    await fireEvent.changeText(
      tela.getByLabelText("Meta de alimentação"),
      "12",
    );
    await fireEvent.press(tela.getByLabelText("Salvar meta"));
    expect(getGoals().feeding).toBe(3);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("avisa que os dias que já passaram mudam junto", async () => {
    const { tela } = await abrir("exercise", "Exercício");
    expect(tela.getByText(/também nos dias que já passaram/)).toBeTruthy();
  });

  it("só a água tem a seção do peso", async () => {
    expect(
      (await abrir("study", "Estudo")).tela.queryByText("Pelo peso"),
    ).toBeNull();
    expect(
      (await abrir("water", "Água")).tela.getByText("Pelo peso"),
    ).toBeTruthy();
  });
});

describe("peso sugere a água", () => {
  it("o botão preenche a meta, e o Salvar grava meta e peso", async () => {
    const { tela } = await abrir("water", "Água");
    await fireEvent.changeText(tela.getByLabelText("Peso em quilos"), "70");
    await fireEvent.press(
      tela.getByLabelText("Usar a meta calculada pelo peso"),
    );
    expect(tela.getByLabelText("Meta de água").props.value).toBe("2,5");
    // Preencher não salva: a meta é o número que a pessoa confirma.
    expect(getGoals().water).toBe(2000);
    expect(mockPeso.salvar).not.toHaveBeenCalled();

    await fireEvent.press(tela.getByLabelText("Salvar meta"));
    expect(getGoals().water).toBe(2500);
    expect(mockPeso.salvar).toHaveBeenCalledWith(70);
  });

  it("o peso guardado aparece no campo", async () => {
    mockPeso.kg = 82.5;
    const { tela } = await abrir("water", "Água");
    expect(tela.getByLabelText("Peso em quilos").props.value).toBe("82,5");
    expect(tela.getByText("Usar 2,9 L")).toBeTruthy();
  });

  it("proteção travada não oferece o campo e leva à proteção", async () => {
    mockPeso.protecao = "travado";
    const { tela } = await abrir("water", "Água");
    expect(tela.queryByLabelText("Peso em quilos")).toBeNull();
    expect(tela.getByText(/Destrave a proteção/)).toBeTruthy();
    expect(tela.getByLabelText("Abrir a proteção")).toBeTruthy();
  });

  it("sem proteção criada, pede pra criar", async () => {
    mockPeso.protecao = "sem-protecao";
    expect(
      (await abrir("water", "Água")).tela.getByText(/Crie a proteção/),
    ).toBeTruthy();
  });
});

describe("tela da água", () => {
  it("lê a meta salva, e acompanha a edição", async () => {
    const tela = await render(<WaterQuickAdd />);
    expect(tela.getByText("de 2,0 L hoje")).toBeTruthy();
    await act(async () => {
      setGoal("water", 1000);
    });
    expect(tela.getByText("de 1,0 L hoje")).toBeTruthy();
  });
});

describe("Ajustes → Metas do dia", () => {
  // A capacidade só existe se a linha abrir o modal. Sem este teste, tudo
  // acima passaria com a linha ainda desabilitada.
  it("a linha da água abre o modal, e a do sono não", async () => {
    const Ajustes = require("@/app/ajustes").default;
    const tela = await renderRouter({
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: Ajustes,
    });
    // As seções nascem fechadas.
    await fireEvent.press(tela.getByLabelText("Metas do dia"));
    await fireEvent.press(tela.getByLabelText("Água"));
    expect(tela.getByText("Meta diária de água")).toBeTruthy();
    expect(tela.queryByLabelText("Sono")).toBeNull();
  });
});
