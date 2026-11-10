// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// O incremento do card de foco precisa virar registro do dia (#421). Os
// testes de domínio passavam e o botão não fazia nada visível: o `quickAdd`
// da Home não mandava data, o registro nascia com `date: ""` e nenhuma tela o
// enxergava. Por isso o teste toca o botão na tela, em vez de chamar o `add`.
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import Home from "@/app/index";
import { add, getToday, localStore, store } from "@/infra/database";

beforeEach(() => {
  store.delTables();
  store.delValues();
  // Um registro de hoje tira a Home da retomada.
  add("sleep", { date: new Date().toISOString(), quantity: 480, unit: "min" });
});

afterEach(() => {
  localStore.delValue("journeyDemoLevel");
});

async function abrirComFoco(nivel) {
  // A previsualização de nível põe no foco o hábito do nível sem fabricar
  // semanas de histórico: nível 2 é a água, 3 é a alimentação.
  localStore.setValue("journeyDemoLevel", nivel);
  return renderRouter({
    _layout: () => <Stack screenOptions={{ headerShown: false }} />,
    index: Home,
  });
}

describe("incremento da Home (#421)", () => {
  it("+200 ml vira registro de água de hoje", async () => {
    const tela = await abrirComFoco(2);
    expect(tela.getByText("0 registros hoje")).toBeTruthy();

    await act(async () => {
      fireEvent.press(tela.getByLabelText("Adicionar +200ml em Água"));
    });

    expect(getToday().water.map((r) => r.quantity)).toEqual([200]);
    expect(tela.getByText("1 registro hoje")).toBeTruthy();
  });

  it("+1 refeição vira registro de alimentação de hoje", async () => {
    const tela = await abrirComFoco(3);

    await act(async () => {
      fireEvent.press(
        tela.getByLabelText("Adicionar +1 refeição em Alimentação"),
      );
    });

    expect(getToday().feeding).toHaveLength(1);
    expect(tela.getByText("1 registro hoje")).toBeTruthy();
  });
});
