// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Teste da corrida da persistência (#108) — a razão de existir do M4.
//
// O bug: a persistência carrega de forma assíncrona (`await startAutoLoad()`),
// mas a tela lia a store UMA vez (no foco). No primeiro load lia a store vazia e
// nunca era avisada quando os dados chegavam — a Home aparecia sem dados até
// navegar e voltar. O #126 (crash ao excluir) nasceu justamente ao corrigir isso.
//
// O fix: `useTable` ASSINA a store e re-renderiza quando ela muda. Este teste
// reproduz a forma temporal do bug — monta VAZIO e só depois a store ganha dados
// — e exige que o consumidor atualize sozinho. Rodado contra o padrão antigo
// (leitura única, sem assinatura), ele FALHA; contra o atual, passa.
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useTable } from "tinybase/ui-react";

import { store, add, getToday } from "../infra/database";

beforeEach(() => {
  store.delTables();
});

test("o consumidor atualiza quando a store ganha dados depois do mount (#108)", async () => {
  // renderHook da RNTL 14 é async. Monta com a store vazia — como no primeiro
  // load, antes do autoLoad terminar.
  const { result } = await renderHook(() => {
    useTable("records", store); // assina a tabela
    return getToday();
  });

  expect(Object.keys(result.current)).toHaveLength(0);

  // O `startAutoLoad()` "termina" e preenche a store DEPOIS do mount.
  await act(async () => {
    add("water", { date: new Date().toISOString(), quantity: 500, unit: "ml" });
  });

  // Sem reler na mão: a assinatura re-renderiza e o seletor relê a store.
  await waitFor(() => {
    expect(result.current.water).toHaveLength(1);
  });
});
