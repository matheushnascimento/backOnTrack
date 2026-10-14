// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { minutesToHHMM } from "@/constants/duration";
import { parseHHMM, timesFrom } from "@/constants/sleepTimes";
import { formatGoal } from "@/constants/goals";
import { SPAN_NAMES, horaAgora, spanRecord } from "@/constants/timeSpan";
import { useThemeTokens } from "@/constants/themeTokens";

import TimeSpanFields, { useSpanEdits, useTimeSpan } from "./TimeSpanFields";

// UI bespoke da tela de sono (M5-B fatia 2b, mockup 2a·3 do Claude Design).
// Substitui o card Score/OBS/Top/Bottom da MetricScreen quando o registry
// aponta pra `renderCustom`. Padrão "noite passada":
//
//   [deitou     23:40]    [deitar agora]
//   [acordou    07:00]    [levantar agora]
//   [duração    7:20]     (calculado, dim)
//
//   COMO SE SENTE HOJE
//   [mal] [ok] [bem] [ótimo]
//
//   [Registrar]
//
// Qualidade mapeia pra `score` (2/3/4/5) pra reusar a infra do histórico.
//
// Fatia do sono do #256: quando `recordId` chega (edição pelo HistoryCard), o
// componente troca pra <SleepEdit>.
//
// Desde a #328 o registro guarda `bed` e `wake` no `details`. Registro gravado
// ANTES disso não tem os campos, e era a maioria do histórico: a edição tinha
// um segundo formulário, só de duração, pra dar conta deles. O #366 fechou esse
// ramo, porque a duração virou campo editável no mesmo bloco, e aí o registro
// antigo abre com duração preenchida e horários vazios que ele pode receber.
// O `timesFrom` continua dizendo quais campos vêm preenchidos, e já não
// escolhe formulário.
//
// Score fora do range QUALITY (registros antigos com estrelas 0-5) fica sem
// pill selecionada e o valor original é preservado no save se o usuário não
// tocar. Legacy min/max/ideal também são preservados.

const QUALITY = [
  { key: "mal", label: "mal", score: 2 },
  { key: "ok", label: "ok", score: 3 },
  { key: "bem", label: "bem", score: 4 },
  { key: "otimo", label: "ótimo", score: 5 },
];

/**
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function SleepBespoke({ onAfterAdd, recordId }) {
  if (recordId)
    return <SleepEdit recordId={recordId} onAfterSave={onAfterAdd} />;
  return <SleepCreate onAfterAdd={onAfterAdd} />;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
function SleepCreate({ onAfterAdd }) {
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [duration, setDuration] = useState("");
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));

  const { lastEdited, marcar, esquecer } = useSpanEdits();
  const span = useTimeSpan({
    start: bedTime,
    end: wakeTime,
    duration,
    metric: "sleep",
    lastEdited,
  });

  // Só o deitar é obrigatório (#349). O §4.2 do modelo separou os papéis:
  // deitar é o comportamento, acordar habilita a duração, e qualidade é
  // percepção. Exigir os três contraria o comportamento que se quer repetir.
  //
  // O que mudou no #366: vale o deitar RECONCILIADO, e não o campo digitado.
  // Quem informa acordar e duração determinou a hora de deitar, e recusar isso
  // seria pedir um dado que já está na tela.
  const canSave = parseHHMM(span.start) != null && span.issue == null;

  function handleSave() {
    if (!canSave) return;
    add("sleep", {
      date: getDate().ISOdate,
      unit: "min",
      ...(quality != null ? { score: quality } : {}),
      // Os horários vão junto (#328). Antes morriam aqui, e a edição só
      // conseguia oferecer duração porque o dado não existia.
      //
      // A duração é DESFECHO (§4.2), e zero significa "não informado": a Home
      // trata isso mostrando o horário de deitar em vez de formatar "0:00".
      ...spanRecord(span, SPAN_NAMES.sleep),
    });
    setBedTime("");
    setWakeTime("");
    setDuration("");
    setQuality(null);
    esquecer();
    onAfterAdd?.();
  }

  return (
    <View className="gap-4">
      {/* "deitou", e não "dormiu": dormir é desfecho, deitar é o
          comportamento que o §4.2 nomeia.

          Sem rótulo de dia. Ele era fixo em "ontem" e assumia que a pessoa
          registra de manhã sobre a noite passada. Com o botão "deitei agora"
          essa suposição cai, e qualquer regra que eu derivasse do horário
          seria um palpite exibido como fato. Não dizer o dia é mais honesto
          que adivinhá-lo. */}
      <TimeSpanFields
        span={span}
        fields={camposDaNoite({
          bedTime,
          setBedTime,
          wakeTime,
          setWakeTime,
          duration,
          setDuration,
          marcar,
        })}
        hint={`suficiente costuma ser ${formatGoal("sleep")}`}
      />

      {/* qualidade */}
      <View className="mt-2">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como se sente hoje (opcional)
        </Text>
        <QualityPills value={quality} onChange={setQuality} />
      </View>

      {/* registrar */}
      <PrimaryButton
        label="Registrar"
        onPress={handleSave}
        disabled={!canSave}
        accessibilityLabel="Registrar sono"
      />
    </View>
  );
}

/**
 * Descritores da noite, iguais na criação e na edição.
 *
 * A duração entra como campo, e não como caixa de leitura. Ela era calculada e
 * exibida, e só dava pra corrigi-la mexendo nos horários. Agora aceita
 * digitação, com um custo aceito de propósito: registro só com duração não tem
 * `bed`, e sem `bed` não entra no sinal de regularidade do §5. É por isso que o
 * deitar segue sendo o único campo que a criação exige.
 */
function camposDaNoite({
  bedTime,
  setBedTime,
  wakeTime,
  setWakeTime,
  duration,
  setDuration,
  marcar,
}) {
  return [
    {
      key: "start",
      label: "deitou",
      placeholder: "23:00",
      value: bedTime,
      onChange: marcar("start", setBedTime),
      // Atalho do momento do comportamento: um toque na hora de deitar
      // registra o horário exato, em vez de depender de lembrar depois.
      agora: () => setBedTime(horaAgora()),
      agoraLabel: "deitar agora",
    },
    {
      key: "end",
      label: "acordou (opcional)",
      placeholder: "07:00",
      value: wakeTime,
      onChange: marcar("end", setWakeTime),
      agora: () => setWakeTime(horaAgora()),
      agoraLabel: "levantar agora",
    },
    {
      key: "duration",
      label: "duração (opcional)",
      placeholder: "8:00",
      value: duration,
      onChange: marcar("duration", setDuration),
    },
  ];
}

/**
 * Edição de um registro de sono pelo HistoryCard.
 *
 * Tinha dois formulários, decididos pelo dado: registro com `bed`/`wake` editava
 * horário, e registro anterior à #328 editava duração direto, porque os
 * horários dele nunca foram gravados. Os dois colapsaram no #366: com a duração
 * editável, o mesmo bloco serve pros dois casos, e o registro antigo ganha de
 * graça a chance de receber os horários que lhe faltavam.
 *
 * Score fora do range QUALITY (registros antigos) preserva-se se a pill não
 * for tocada. Legacy min/max/ideal também são preservados.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function SleepEdit({ recordId, onAfterSave }) {
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));
  const [qualityTouched, setQualityTouched] = useState(false);
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    // `timesFrom` devolve null pro histórico anterior à #328, que é a maioria.
    // Isso já não escolhe formulário: só diz quais campos vêm preenchidos.
    const horarios = timesFrom(r);
    if (horarios) {
      setBedTime(horarios.bed);
      setWakeTime(horarios.wake);
    }
    setDuration(minutesToHHMM(r.quantity));
    setNote(r.note ?? r.observation ?? "");
    // Só pré-seleciona a pill se o score bater com os valores canônicos v2.
    // Scores fora disso (registros antigos com 0/1) ficam sem pill mas são
    // preservados no save via qualityTouched=false.
    if (QUALITY.some((q) => q.score === r.score)) {
      setQuality(r.score);
    }
  }, [recordId]);

  const { lastEdited, marcar } = useSpanEdits();
  const span = useTimeSpan({
    start: bedTime,
    end: wakeTime,
    duration,
    metric: "sleep",
    lastEdited,
  });
  const tempo = spanRecord(span, SPAN_NAMES.sleep);

  // Na edição é a duração que precisa sobrar: o registro já existe com um
  // valor, e salvar zerando-o apagaria dado sem a pessoa pedir. O deitar
  // continua opcional aqui, porque o registro antigo não tem como oferecê-lo.
  const canSave = loaded != null && tempo.quantity > 0 && span.issue == null;

  function handlePickQuality(score) {
    setQuality(score);
    setQualityTouched(true);
  }

  function handleSave() {
    if (!canSave) return;
    // Todo campo tem que ser repassado: o `update` RECONSTRÓI o details, e o
    // que não vem SOME em silêncio (#328, #332). Nos horários isso é útil:
    // campo esvaziado some de propósito, em vez de virar "" e fazer o
    // `timesFrom` devolver null sem motivo aparente.
    update(recordId, {
      unit: "min",
      note,
      score: qualityTouched ? quality : loaded.score,
      min: loaded.min,
      max: loaded.max,
      ideal: loaded.ideal,
      ...tempo,
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      {/* Mesmos campos da criação: corrigir "acordei 07:10" é o que a pessoa
          quer fazer, em vez de recalcular a duração de cabeça. */}
      <TimeSpanFields
        span={span}
        fields={camposDaNoite({
          bedTime,
          setBedTime,
          wakeTime,
          setWakeTime,
          duration,
          setDuration,
          marcar,
        })}
      />

      {/* Qualidade */}
      <View>
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como se sentiu
        </Text>
        <QualityPills value={quality} onChange={handlePickQuality} />
      </View>

      {/* OBS */}
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          OBS
        </Text>
        <NoteInput value={note} onChange={setNote} />
      </View>

      {/* Salvar */}
      <PrimaryButton
        label="Salvar alterações"
        onPress={handleSave}
        disabled={!canSave}
        accessibilityLabel="Salvar alterações"
      />
    </View>
  );
}

/** @param {{ value: number|null, onChange: (score: number) => void }} props */
function QualityPills({ value, onChange }) {
  return (
    <View className="flex-row gap-2">
      {QUALITY.map((q) => {
        const selected = value === q.score;
        return (
          <Pressable
            key={q.key}
            accessibilityRole="button"
            accessibilityLabel={`Qualidade: ${q.label}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(q.score)}
            className={`flex-1 items-center rounded-xl py-3 ${
              selected
                ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
                : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
            }`}
          >
            <Text
              className={`text-xs ${
                selected
                  ? "text-primary dark:text-primary-dark"
                  : "text-body-secondary dark:text-body-secondary-dark"
              }`}
              style={{
                fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
              }}
            >
              {q.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * @param {{
 *   label: string,
 *   onPress: () => void,
 *   disabled: boolean,
 *   accessibilityLabel: string,
 * }} props
 */
function PrimaryButton({ label, onPress, disabled, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`mt-2 items-center rounded-2xl py-4 ${
        disabled
          ? "bg-border-strong dark:bg-border-strong-dark"
          : "bg-primary dark:bg-primary-dark active:opacity-70"
      }`}
    >
      <Text
        className="text-base text-white dark:text-on-primary-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** @param {{ value: string, onChange: (v: string) => void }} props */
function NoteInput({ value, onChange }) {
  const t = useThemeTokens();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Observações sobre sono..."
      placeholderTextColor={t.iconDim}
      multiline
      accessibilityLabel="Observações"
      style={{
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        color: t.ink,
        padding: 0,
        minHeight: 44,
        textAlignVertical: "top",
      }}
    />
  );
}
