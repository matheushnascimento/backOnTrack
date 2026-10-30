// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo

/**
 * As metas do autocuidado deste aparelho, decifradas, com o progresso (#395).
 *
 * Sem as chaves, `estado` vem `travado` e o progresso vazio: quem mostra
 * (Home, Semana) cai no que já mostrava antes, sem dizer o que está
 * escondido.
 */

import { useMemo } from "react";
import { useTable, useValue } from "tinybase/ui-react";

import { lerMetas, progressoDasMetas } from "@/constants/selfcareGoals";

import { store } from "./database";
import { useChaves } from "./useProtection";

/**
 * @returns {{
 *   estado: "aberto"|"travado"|"ilegivel",
 *   metas: Record<string, {vezes: number, periodo: "dia"|"semana"}>,
 *   progresso: ReturnType<typeof progressoDasMetas>,
 * }}
 */
export function useSelfcareGoals() {
  const chaves = useChaves();
  const protegido = useValue("selfcareGoals", store);
  const registros = useTable("records", store);

  return useMemo(() => {
    const lido = lerMetas(chaves, protegido);
    if (lido.estado !== "aberto") {
      return { estado: lido.estado, metas: {}, progresso: [] };
    }
    return {
      estado: "aberto",
      metas: lido.metas,
      progresso: progressoDasMetas(chaves, lido.metas, registros),
    };
  }, [chaves, protegido, registros]);
}
