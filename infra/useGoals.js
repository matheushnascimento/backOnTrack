import { useMemo } from "react";
import { useTable } from "tinybase/ui-react";

import { getGoals, store } from "@/infra/database";

/**
 * Metas do store como `{ metric: target }`, assinadas (#423).
 *
 * A assinatura da tabela é o que faz uma meta editada em Ajustes chegar às
 * outras telas sem reabrir, e também as metas semeadas depois do load do
 * persister.
 *
 * @returns {Record<string, number>}
 */
export function useGoals() {
  const tabela = useTable("goals", store);
  return useMemo(
    () => /** @type {Record<string, number>} */ (getGoals()),
    // `tabela` é a assinatura; o `getGoals` lê a store direto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabela],
  );
}
