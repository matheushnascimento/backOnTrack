// @ts-nocheck -- hook de infra; tipos vêm quando infra/ for tipada (ADR-002)
import { useMemo } from "react";
import { useTable, useValue } from "tinybase/ui-react";

import { deriveJourney } from "@/constants/journey";
import { getGoals, getGrantedHabits, store } from "./database";

// Origem única do estado da jornada (#297).
//
// ⚠️ **Existe por causa de um bug que aconteceu duas vezes.**
//
// A derivação vive numa função pura bem testada, mas ela precisa receber
// vários pedaços do store: metas, pico, concessões. Quando cada tela montava
// esses argumentos por conta própria, era questão de tempo até uma esquecer
// um: a Home ficou sem passar `granted`, e por isso a conferência de
// histórico (#295) e a previsualização de estabilidade não tinham **nenhum**
// efeito na tela principal. Os 269 testes seguiram verdes, porque testam a
// função, e não quem a chama.
//
// Com um hook só, existe um lugar pra ligar e um lugar pra errar. Se faltar
// argumento, falta pra todo mundo ao mesmo tempo, o que é visível na hora.
//
// A lição mais geral: teste de função pura não pega "ninguém chamou". Só
// rodar o app pega, e foi o usuário quem viu.

/**
 * Estado da jornada, com todos os insumos do store já ligados.
 *
 * @param {{previousLevel?: number|null}} [opts] `previousLevel` explícito
 *   sobrescreve o pico, útil pra previsualização.
 * @returns {{level: number, habits: object, focus: string|null, regressed: boolean}}
 */
export function useJourney(opts = {}) {
  const records = useTable("records", store);
  const goalsTable = useTable("goals", store);
  const peak = useValue("journeyPeakLevel", store);
  // Estes dois não são lidos no corpo do memo, mas SÃO a assinatura: os
  // getters leem o store direto, e sem eles nas deps o estado congelaria.
  const grantedValue = useValue("journeyGranted", store);

  return useMemo(
    () =>
      deriveJourney({
        records: Object.values(records ?? {}),
        goals: getGoals(),
        granted: getGrantedHabits(),
        previousLevel:
          opts.previousLevel !== undefined
            ? opts.previousLevel
            : Number(peak) || null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, goalsTable, peak, grantedValue, opts.previousLevel],
  );
}
