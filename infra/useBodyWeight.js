import { useCallback, useMemo } from "react";
import { useValue } from "tinybase/ui-react";

import { cifrarPeso, lerPeso } from "@/constants/bodyWeight";

import { setBodyWeight, store } from "./database";
import { useProtection } from "./useProtection";

/**
 * O peso deste aparelho, decifrado, e como gravar um novo (#423).
 *
 * `protecao` diz se dá pra ler e gravar: sem a chave destravada, o peso não
 * abre nem pode ser salvo, porque ele só viaja cifrado.
 *
 * @returns {{
 *   protecao: "sem-protecao" | "travado" | "destravado",
 *   kg: number | null,
 *   salvar: (kg: number) => boolean,
 * }}
 */
export function useBodyWeight() {
  const { status, chaves, principal } = useProtection();
  const protegido = useValue("bodyWeight", store);

  const kg = useMemo(() => {
    const lido = lerPeso(chaves, /** @type {string} */ (protegido));
    return lido.estado === "aberto" ? lido.kg : null;
  }, [chaves, protegido]);

  const salvar = useCallback(
    /** @param {number} novo */
    (novo) => {
      if (status !== "destravado" || !principal) return false;
      const chave = { kid: principal.kid, dataKey: chaves[principal.kid] };
      setBodyWeight(cifrarPeso(chave, novo));
      return true;
    },
    [status, chaves, principal],
  );

  return {
    protecao: /** @type {"sem-protecao" | "travado" | "destravado"} */ (status),
    kg,
    salvar,
  };
}
