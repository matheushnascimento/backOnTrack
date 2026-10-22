// @ts-nocheck -- API do expo-notifications não é tipada aqui (ADR-002)
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useTable, useValue } from "tinybase/ui-react";

import { CATEGORY_MAP } from "@/components/categoryUtils";
import {
  DIAS_AGENDADOS,
  reminderSchedule,
  reminderText,
} from "@/constants/reminder";
import {
  sleepReminderSchedule,
  sleepReminderText,
  sleepTakesOverFocus,
} from "@/constants/sleepReminder";
import { getToday, localStore, store } from "./database";
import { useJourney } from "./useJourney";

// Lembrete diário do hábito em foco (#364).
//
// A regra de QUANDO vive em `constants/reminder.js`, pura e testada. Aqui mora
// só o que depende do módulo nativo, que não roda no jest.
//
// ## Ocorrências avulsas, nunca um disparo diário
//
// O `expo-notifications` não executa código na hora do disparo, então não há
// como perguntar "já registrou?" naquele instante. Um gatilho `DAILY`
// dispararia mesmo depois do registro, que é a cobrança que o modelo recusa.
//
// Por isso a estratégia é: cancelar e agendar as **próximas** ocorrências,
// até `DIAS_AGENDADOS`, recalculando a cada mudança de estado. O silêncio
// depois do registro é garantido pela ausência do agendamento, e não por uma
// condição que ninguém avalia.
//
// ## Cada lembrete cancela só o que é dele
//
// Os agendamentos levam identificador com prefixo. Cancelar tudo funcionava
// com um tipo de lembrete só, e apagaria os do sono no instante em que os dois
// convivessem.
//
// ## Web fica de fora
//
// Notificação local agendada não funciona de forma confiável no navegador, e
// o app web é superfície de conferência, não de uso diário. Tudo aqui vira
// no-op fora do native, pra não quebrar o build da Vercel.

const CANAL = "lembretes";

const isNative = () => Platform.OS === "ios" || Platform.OS === "android";

/** Prefixo dos agendamentos do lembrete do foco. */
const PREFIXO_FOCO = "foco-";

/** Prefixo dos agendamentos do lembrete do sono (#368). */
const PREFIXO_SONO = "sono-";

/** Cancela só os agendamentos cujo identificador começa com `prefixo`. */
async function cancelarPorPrefixo(prefixo) {
  const agendados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendados
      .filter((n) => n.identifier?.startsWith(prefixo))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Pede permissão de notificação, se ainda não houver.
 *
 * O Android 13+ exige `POST_NOTIFICATIONS` em runtime; antes disso a
 * permissão vinha com a instalação. O `requestPermissionsAsync` cobre os dois.
 *
 * @returns {Promise<boolean>} concedida?
 */
export async function ensureNotificationPermission() {
  if (!isNative()) return false;
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
 * @returns {Promise<number[]>} instantes agendados, vazio se nada foi agendado
 */
export async function rescheduleFocusReminder(estado) {
  if (!isNative()) return [];

  const datas = reminderSchedule(estado);

  // Cancela sempre, inclusive quando nada será agendado: é assim que o
  // lembrete some depois do registro, ou quando a pessoa desliga.
  await cancelarPorPrefixo(PREFIXO_FOCO);
  if (datas.length === 0) return [];

  if (!(await ensureNotificationPermission())) return [];
  await ensureCanal();

  const conteudo = reminderText(estado.focus, CATEGORY_MAP);
  await Promise.all(
    datas.map((quando, i) => agendar(`${PREFIXO_FOCO}${i}`, conteudo, quando)),
  );
  return datas;
}

/** Uma ocorrência avulsa, no canal dos lembretes. */
function agendar(identifier, content, quando) {
  return Notifications.scheduleNotificationAsync({
    identifier,
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(quando),
      ...(Platform.OS === "android" ? { channelId: CANAL } : {}),
    },
  });
}

/**
 * Reagenda os lembretes do sono (#368), cancelando só os dele.
 *
 * A regra de QUANDO é toda do `sleepReminderSchedule`: horário típico,
 * mínimo de noites, folga de 30 min e noites já registradas.
 *
 * @param {{records: Array<object>, enabled: boolean}} estado linhas cruas
 * @returns {Promise<Array<{kind: string, at: number}>>}
 */
export async function rescheduleSleepReminder({ records, enabled }) {
  if (!isNative()) return [];

  const agenda = sleepReminderSchedule({
    records,
    enabled,
    dias: DIAS_AGENDADOS,
  });

  await cancelarPorPrefixo(PREFIXO_SONO);
  if (agenda.length === 0) return [];

  if (!(await ensureNotificationPermission())) return [];
  await ensureCanal();

  await Promise.all(
    agenda.map(({ kind, at }, i) =>
      agendar(`${PREFIXO_SONO}${kind}-${i}`, sleepReminderText(kind), at),
    ),
  );
  return agenda;
}

/**
 * Mantém o lembrete em dia enquanto o app estiver montado.
 *
 * Reage a tudo que muda a resposta: registro novo (a tabela), troca de hábito
 * em foco, e as duas preferências. Chamar no root, uma vez.
 */
export function useFocusReminder() {
  const enabled = useValue("reminderEnabled", localStore);
  const hhmm = useValue("reminderTime", localStore);
  const sleepEnabled = useValue("sleepReminderEnabled", localStore);
  const records = useTable("records", store);
  const { focus } = useJourney();

  useEffect(() => {
    if (!isNative()) return;
    // `records` é gatilho de propósito: o `getToday` relê a store, e sem ele
    // nas deps o lembrete não sumiria logo depois de registrar. Mesmo padrão
    // do memo da Home (#108).
    const hoje = getToday();
    const registeredToday = (hoje?.[focus]?.length ?? 0) > 0;

    // Com o foco no sono e o lembrete do sono ativo e com noites, o fixo se
    // cala: seriam dois lembretes sobre a mesma noite (#368).
    const assumido = sleepTakesOverFocus({
      focus,
      enabled: Boolean(sleepEnabled),
      records: Object.values(records ?? {}),
    });

    rescheduleFocusReminder({
      enabled: Boolean(enabled) && !assumido,
      hhmm: String(hhmm ?? ""),
      focus,
      registeredToday,
    }).catch((e) => {
      // Falha aqui não pode derrubar o app: sem permissão, ou num emulador
      // sem serviços, o lembrete simplesmente não existe.
      console.warn("[reminders] não consegui reagendar:", e?.message ?? e);
    });
  }, [enabled, hhmm, focus, records, sleepEnabled]);
}

/**
 * Mantém os lembretes do sono em dia enquanto o app estiver montado (#368).
 *
 * Reage a registro novo e ao interruptor. Chamar no root, uma vez, ao lado do
 * `useFocusReminder`.
 *
 * ⚠️ Passa as LINHAS CRUAS do `useTable`, com `bed` e `wake` presos no
 * `details`. O `sleepReminderSchedule` lê pelo `bedOf`/`wakeOf`, que aceitam
 * esse formato. Ler `registro.bed` direto aqui devolveria `undefined` sem erro,
 * que foi como o #344 ficou sem efeito em produção (#356).
 */
export function useSleepReminder() {
  const enabled = useValue("sleepReminderEnabled", localStore);
  const records = useTable("records", store);

  useEffect(() => {
    if (!isNative()) return;
    rescheduleSleepReminder({
      records: Object.values(records ?? {}),
      enabled: Boolean(enabled),
    }).catch((e) => {
      console.warn(
        "[reminders] não consegui reagendar o sono:",
        e?.message ?? e,
      );
    });
  }, [enabled, records]);
}
