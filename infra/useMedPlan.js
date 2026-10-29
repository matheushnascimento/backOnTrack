// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo

/**
 * O plano de remédios deste aparelho, decifrado (#392).
 *
 * Junta a tabela `meds`, os registros e as chaves destrancadas. Sem as chaves,
 * os remédios vêm `travado` e as marcas não aparecem: decifrar é a única forma
 * de saber o que é marca do plano.
 */

import { useMemo } from "react";
import { useTable } from "tinybase/ui-react";

import { marcasDoPlano, remediosDaTabela } from "@/constants/medPlan";

import { store } from "./database";
import { useChaves } from "./useProtection";

/**
 * @returns {{
 *   chaves: Record<string, Uint8Array>,
 *   remedios: ReturnType<typeof remediosDaTabela>,
 *   marcas: ReturnType<typeof marcasDoPlano>,
 * }}
 */
export function useMedPlan() {
  const chaves = useChaves();
  const tabela = useTable("meds", store);
  const registros = useTable("records", store);

  const remedios = useMemo(
    () => remediosDaTabela(chaves, tabela),
    [chaves, tabela],
  );
  const marcas = useMemo(
    () => marcasDoPlano(chaves, registros),
    [chaves, registros],
  );
  return { chaves, remedios, marcas };
}
