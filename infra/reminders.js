// @ts-nocheck -- API do expo-notifications não é tipada aqui (ADR-002)
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useTable, useValue } from "tinybase/ui-react";

import { CATEGORY_MAP } from "@/components/categoryUtils";
import { nextReminderAt, reminderText } from "@/constants/reminder";
import { getToday, store } from "./database";
import { useJourney } from "./useJourney";

// Lembrete diário do hábito em foco (#364).
//
// A regra de QUANDO vive em `constants/reminder.js`, pura e testada. Aqui mora
// só o que depende do módulo nativo, que não roda no jest.
//
// ## Uma ocorrência por vez, nunca um disparo diário
//
// O `expo-notifications` não executa código na hora do disparo, então não há
// como perguntar "já registrou?" naquele instante. Um gatilho `DAILY`
// dispararia mesmo depois do registro, que é a cobrança que o modelo recusa.
//
// Por isso a estratégia é: cancelar tudo e agendar a **próxima** ocorrência,
// recalculando a cada mudança de estado. O custo é reagendar com frequência,
// o que é barato, e o ganho é que o silêncio depois do registro é garantido
// pela ausência do agendamento, e não por uma condição que ninguém avalia.
//
// ## Web fica de fora
//
// Notificação local agendada não funciona de forma confiável no navegador, e
// o app web é superfície de conferência, não de uso diário. Tudo aqui vira
// no-op fora do native, pra não quebrar o build da Vercel.

const CANAL = "lembretes";

const noNative = () => Platform.OS === "ios" || Platform.OS === "android";

/**
 * Pede permissão de notificação, se ainda não houver.
 *
 * O Android 13+ exige `POST_NOTIFICATIONS` em runtime; antes disso a
 * permissão vinha com a instalação. O `requestPermissionsAsync` cobre os dois.
 *
 * @returns {Promise<boolean>} concedida?
 */
export async function ensureNotificationPermission() {
  if (!noNative()) return false;
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  // `canAskAgain` falso significa que a pessoa negou de forma definitiva.
  // Insistir abriria nada e devolveria negado de novo.
  if (!atual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return Boolean(pedido.granted);
}

/** Canal do Android. Sem canal, a notificação não aparece no 8.0+. */
async function ensureCanal() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: "Lembretes",
    importance: Notifications.AndroidImportance.DEFAULT,
    // DEFAULT e não HIGH de propósito: lembrete não é urgência, e heads-up
    // seria mais intrusivo do que o tom do app admite.
  });
}

/**
 * Reagenda o lembrete, cancelando o que houver antes.
 *
 * Idempotente: chamar duas vezes com o mesmo estado deixa um agendamento só.
 *
 * @param {{enabled: boolean, hhmm: string, focus: string|null, registeredToday: boolean}} estado
 * @returns {Promise<number|null>} instante agendado, ou `null` se nada foi agendado
 */
export async function rescheduleFocusReminder(estado) {
  if (!noNative()) return null;

  const quando = nextReminderAt(estado);

  // Cancela sempre, inclusive quando nada será agendado: é assim que o
  // lembrete some depois do registro, ou quando a pessoa desliga.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (quando == null) return null;

  if (!(await ensureNotificationPermission())) return null;
  await ensureCanal();

  const { title, body } = reminderText(estado.focus, CATEGORY_MAP);
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(quando),
      ...(Platform.OS === "android" ? { channelId: CANAL } : {}),
    },
  });
  return quando;
}

/**
 * Mantém o lembrete em dia enquanto o app estiver montado.
 *
 * Reage a tudo que muda a resposta: registro novo (a tabela), troca de hábito
 * em foco, e as duas preferências. Chamar no root, uma vez.
 */
export function useFocusReminder() {
  const enabled = useValue("reminderEnabled", store);
  const hhmm = useValue("reminderTime", store);
  const records = useTable("records", store);
  const { focus } = useJourney();

  useEffect(() => {
    if (!noNative()) return;
    // `records` é gatilho de propósito: o `getToday` relê a store, e sem ele
    // nas deps o lembrete não sumiria logo depois de registrar. Mesmo padrão
    // do memo da Home (#108).
    const hoje = getToday();
    const registeredToday = (hoje?.[focus]?.length ?? 0) > 0;

    rescheduleFocusReminder({
      enabled: Boolean(enabled),
      hhmm: String(hhmm ?? ""),
      focus,
      registeredToday,
    }).catch((e) => {
      // Falha aqui não pode derrubar o app: sem permissão, ou num emulador
      // sem serviços, o lembrete simplesmente não existe.
      console.warn("[reminders] não consegui reagendar:", e?.message ?? e);
    });
  }, [enabled, hhmm, focus, records]);
}
