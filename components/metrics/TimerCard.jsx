// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useValue } from "tinybase/ui-react";

import { CATEGORY_MAP } from "@/components/categoryUtils";
import { confirmAction } from "@/constants/dialogs";
import {
  elapsedMs,
  forgottenTimer,
  formatElapsed,
  timerStateFor,
  timerStopFields,
} from "@/constants/timer";
import { horaAgora } from "@/constants/timeSpan";
import { clearTimer, localStore, startTimer } from "@/infra/database";

// Timer de exercício e estudo (#369). A regra mora em `constants/timer.js`;
// aqui é só a cara dele e a ligação com o `localStore`.
//
// Parar NÃO grava o registro: preenche início e fim nos campos da tela, e a
// pessoa ainda escolhe modalidade, intensidade ou foco e toca em Registrar. O
// timer é um jeito de digitar horário, e não um atalho que pula o formulário.

/**
 * @param {{
 *   metric: "exercise"|"study",
 *   onStop: (campos: {start: string, end: string}) => void,
 * }} props `onStop` recebe os horários de relógio do início e de agora
 */
export default function TimerCard({ metric, onStop }) {
  const timerMetric = useValue("timerMetric", localStore);
  const startedAt = Number(useValue("timerStartedAt", localStore)) || 0;
  const running = timerMetric ? { metric: timerMetric, startedAt } : null;
  const estado = timerStateFor({ running, metric });

  // Só pra redesenhar o relógio. O decorrido é sempre recalculado de
  // `startedAt`, então pular tiques (app em segundo plano) não acumula erro.
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    if (estado !== "rodando") return undefined;
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [estado]);

  function parar() {
    const fim = Date.now();
    const usar = () => {
      onStop(timerStopFields(startedAt, fim));
      clearTimer();
    };
    if (!forgottenTimer({ metric, startedAt, now: fim })) {
      usar();
      return;
    }
    // Passou do teto da métrica: quase sempre o timer ficou esquecido ligado.
    // Gravar sem perguntar seria registrar 9h de estudo.
    confirmAction({
      title: `O timer ficou ligado por ${formatElapsed(elapsedMs(startedAt, fim))}`,
      message:
        "Parece que ele foi esquecido. Usar esses horários mesmo assim? Se cancelar, ele continua; dá pra descartar e preencher os horários à mão.",
      confirmLabel: "Usar",
      destructive: false,
      onConfirm: usar,
    });
  }

  if (estado === "outro") {
    const nome = CATEGORY_MAP[timerMetric]?.displayName ?? timerMetric;
    return (
      <View className="gap-3 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-5 py-4">
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Há um timer de {nome} rodando desde {horaAgora(new Date(startedAt))}.
          Um de cada vez: pare aquele antes de começar outro.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ir para ${nome}`}
          onPress={() => router.navigate(`/(metrics)/${timerMetric}`)}
          className="self-start active:opacity-70"
        >
          <Text
            className="text-sm text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Ir para {nome}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (estado === "rodando") {
    return (
      <View className="gap-3 rounded-2xl border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark px-5 py-4">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-primary dark:text-primary-dark"
            style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 28 }}
            accessibilityLabel={`Tempo decorrido: ${formatElapsed(elapsedMs(startedAt, agora))}`}
          >
            {formatElapsed(elapsedMs(startedAt, agora))}
          </Text>
          <Text
            className="text-xs text-primary dark:text-primary-dark opacity-70"
            style={{ fontFamily: "JetBrainsMono_400Regular" }}
          >
            desde {horaAgora(new Date(startedAt))}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Parar o timer"
            onPress={parar}
            className="flex-1 items-center rounded-xl bg-primary dark:bg-primary-dark py-3 active:opacity-70"
          >
            <Text
              className="text-sm text-white dark:text-on-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Parar
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Descartar o timer"
            onPress={() =>
              confirmAction({
                title: "Descartar o timer",
                message: "O tempo contado até aqui não vai pra lugar nenhum.",
                confirmLabel: "Descartar",
                onConfirm: clearTimer,
              })
            }
            className="items-center rounded-xl border border-primary dark:border-primary-dark px-4 py-3 active:opacity-70"
          >
            <Text
              className="text-sm text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Descartar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Começar o timer agora"
      onPress={() => startTimer(metric)}
      className="flex-row items-center justify-center gap-2 rounded-2xl border border-primary dark:border-primary-dark py-3 active:opacity-70"
    >
      <Text
        className="text-sm text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        Começar o timer agora
      </Text>
    </Pressable>
  );
}
