// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo

/**
 * A escada da higiene do sono neste aparelho (#396).
 *
 * Junta o que está no store (horário-alvo, degraus, registros) com a regra
 * pura de `constants/sleepHygiene.js`, e guarda a única escrita automática:
 * conquistar a regra ativa quando ela fica consistente.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useTable, useValue } from "tinybase/ui-react";

import getDate from "@/constants/getDate";
import {
  degrausDaTabela,
  estadoDaEscada,
  podeComecar,
  sugerirAlvo,
  veredictosDaRegra,
} from "@/constants/sleepHygiene";
import { typicalSleepTimes } from "@/constants/sleepReminder";
import { horaAgora } from "@/constants/timeSpan";

import {
  add,
  conquerHygieneRule,
  swapHygieneRule,
  setHygieneTarget,
  startHygieneRule,
  store,
} from "./database";

export function useSleepHygiene() {
  const alvo = useValue("hygieneTarget", store) ?? "";
  const tabela = useTable("hygieneSteps", store);
  const registros = useTable("records", store);

  const records = useMemo(() => Object.values(registros ?? {}), [registros]);
  const degraus = useMemo(() => degrausDaTabela(tabela), [tabela]);
  const estado = useMemo(
    () => estadoDaEscada({ alvo, degraus, records }),
    [alvo, degraus, records],
  );

  // A regra ativa já cumprida na noite de hoje?
  const cumpridaHoje = useMemo(() => {
    if (!estado.ativa || !estado.alvo) return false;
    return veredictosDaRegra(records, estado.ativa, estado.alvo, 1)[0].hit;
  }, [records, estado.ativa, estado.alvo]);

  const sugestao = useMemo(
    () => sugerirAlvo(typicalSleepTimes(records).bed),
    [records],
  );

  // Consistente, conquista. Em efeito, porque é escrita no store. A próxima
  // regra quem escolhe é a pessoa, então a escada para aqui até ela escolher.
  useEffect(() => {
    if (estado.pronta && estado.ativa) conquerHygieneRule(estado.ativa);
  }, [estado.pronta, estado.ativa]);

  /** Primeira configuração: horário-alvo e a regra por onde começar. */
  const configurar = useCallback((novoAlvo, regra) => {
    setHygieneTarget(novoAlvo);
    startHygieneRule(regra);
  }, []);

  const comecar = useCallback(
    (regra) => {
      if (podeComecar(estado, regra)) startHygieneRule(regra);
    },
    [estado],
  );

  /** Troca a regra ativa por outra ainda não iniciada. */
  const trocarPor = useCallback(
    (regra) => {
      if (!estado.ativa || !(estado.disponiveis ?? []).includes(regra)) return;
      swapHygieneRule(estado.ativa, regra);
    },
    [estado.ativa, estado.disponiveis],
  );

  /** Marca a regra ativa como cumprida, agora. */
  const cumprir = useCallback(() => {
    if (!estado.ativa) return;
    add("sleep", {
      date: getDate().ISOdate,
      unit: "regra",
      quantity: 0,
      regra: estado.ativa,
      at: horaAgora(),
    });
  }, [estado.ativa]);

  return {
    ...estado,
    cumpridaHoje,
    sugestao,
    configurar,
    comecar,
    cumprir,
    trocarPor,
    mudarAlvo: setHygieneTarget,
  };
}
