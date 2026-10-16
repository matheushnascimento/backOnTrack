// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { minutesToHHMM } from "@/constants/duration";
import { SPAN_NAMES, horaAgora, spanRecord } from "@/constants/timeSpan";
import { useThemeTokens } from "@/constants/themeTokens";

import TimeSpanFields, { useSpanEdits, useTimeSpan } from "./TimeSpanFields";

// UI bespoke da tela de exercício (M5-B fatia 2c, mockup 2a·4).
// Toggle Treino/Cardio (independentes) → início/fim/duração → intensidade
// (leve/ok/forte/puxado) mapeando pra score 2/3/4/5.
//
// #366: esta tela era o caso pior dos três. Tinha "começou às" e "duração"
// INDEPENDENTES, sem fim nenhum: dava pra dizer "comecei 10:00, durou 1h" sem
// nada ligar os dois, e nada denunciava "comecei 10:00, durou 9h". Agora os
// três passam pelo `reconcileTimes`.
//
// ⚠️ O início continua gravado como `trainingTime`, e não como `start`. É nome
// legado de todo registro existente, lido também pelo MyHistory, e renomeá-lo
// exigiria migração do `details`. O fim, que é campo novo, entra como `end`.
//
// Fatia do exercício do #256: quando `recordId` chega (edição pelo HistoryCard),
// o componente troca pra <ExerciseEdit>: hidrata modalidade, duração,
// trainingTime, intensidade e OBS do registro; salva via `update`. Score fora
// do range v2 (registros antigos com estrelas 0/1) fica sem pill selecionada e
// é preservado no save via `intensityTouched=false`.

const INTENSITY = [
  { key: "leve", label: "leve", score: 2 },
  { key: "ok", label: "ok", score: 3 },
  { key: "forte", label: "forte", score: 4 },
  { key: "puxado", label: "puxado", score: 5 },
];

/**
 * Descritores na ordem início → fim → duração, iguais na criação e na edição.
 */
function camposDoTreino({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  duration,
  setDuration,
  marcar,
}) {
  return [
    {
      key: "start",
      label: "começou às",
      placeholder: "18:30",
      value: startTime,
      onChange: marcar("start", setStartTime),
      agora: () => setStartTime(horaAgora()),
      agoraLabel: "agora",
    },
    {
      key: "end",
      label: "terminou às",
      placeholder: "19:30",
      value: endTime,
      onChange: marcar("end", setEndTime),
      agora: () => setEndTime(horaAgora()),
      agoraLabel: "agora",
    },
    {
      key: "duration",
      label: "duração",
      placeholder: "1:00",
      value: duration,
      onChange: marcar("duration", setDuration),
    },
  ];
}

/**
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function ExerciseBespoke({ onAfterAdd, recordId }) {
  if (recordId)
    return <ExerciseEdit recordId={recordId} onAfterSave={onAfterAdd} />;
  return <ExerciseCreate onAfterAdd={onAfterAdd} />;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
function ExerciseCreate({ onAfterAdd }) {
  const [training, setTraining] = useState(false);
  const [cardio, setCardio] = useState(false);
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [intensity, setIntensity] = useState(/** @type {number|null} */ (null));

  const { lastEdited, marcar, esquecer } = useSpanEdits();
  const span = useTimeSpan({
    start: startTime,
    end: endTime,
    duration,
    metric: "exercise",
    lastEdited,
  });
  const tempo = spanRecord(span, SPAN_NAMES.exercise);

  // `issue` já exclui o aviso do teto, que avisa e deixa salvar.
  const canSave =
    (training || cardio) &&
    tempo.quantity > 0 &&
    span.issue == null &&
    intensity != null;

  function handleSave() {
    if (!canSave) return;
    add("exercise", {
      date: getDate().ISOdate,
      unit: "min",
      training,
      cardio,
      score: intensity,
      // O início sai como `trainingTime`; ver o aviso no topo do arquivo.
      ...tempo,
    });
    setTraining(false);
    setCardio(false);
    setDuration("");
    setStartTime("");
    setEndTime("");
    setIntensity(null);
    esquecer();
    onAfterAdd?.();
  }

  return (
    <View className="gap-4">
      <ModalityRow
        training={training}
        cardio={cardio}
        onTraining={() => setTraining((v) => !v)}
        onCardio={() => setCardio((v) => !v)}
      />

      <TimeSpanFields
        span={span}
        fields={camposDoTreino({
          startTime,
          setStartTime,
          endTime,
          setEndTime,
          duration,
          setDuration,
          marcar,
        })}
        hint="dois campos quaisquer dão o terceiro"
      />

      <View className="mt-2">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como foi
        </Text>
        <IntensityPills value={intensity} onChange={setIntensity} />
      </View>

      <PrimaryButton
        label="Registrar"
        onPress={handleSave}
        disabled={!canSave}
        accessibilityLabel="Registrar exercício"
      />
    </View>
  );
}

/**
 * Edição de um registro de exercício pelo HistoryCard. Hidrata modalidade,
 * duração, trainingTime, intensidade e OBS. Score fora do range v2 preserva-se
 * se a pill não for tocada. Exercise nunca usou min/max/ideal.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function ExerciseEdit({ recordId, onAfterSave }) {
  const [training, setTraining] = useState(false);
  const [cardio, setCardio] = useState(false);
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [intensity, setIntensity] = useState(/** @type {number|null} */ (null));
  const [intensityTouched, setIntensityTouched] = useState(false);
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    setTraining(!!r.training);
    setCardio(!!r.cardio);
    setDuration(minutesToHHMM(r.quantity));
    // trainingTime pode vir como "" ou ":" em registros que não preencheram —
    // esses viram string vazia pra o placeholder aparecer.
    const rawTrainingTime = String(r.trainingTime ?? "");
    setStartTime(rawTrainingTime === ":" ? "" : rawTrainingTime);
    setEndTime(r.end ? String(r.end) : "");
    setNote(r.note ?? r.observation ?? "");
    if (INTENSITY.some((i) => i.score === r.score)) {
      setIntensity(r.score);
    }
  }, [recordId]);

  const { lastEdited, marcar } = useSpanEdits();
  const span = useTimeSpan({
    start: startTime,
    end: endTime,
    duration,
    metric: "exercise",
    lastEdited,
  });
  const tempo = spanRecord(span, SPAN_NAMES.exercise);

  const canSave =
    loaded != null &&
    (training || cardio) &&
    tempo.quantity > 0 &&
    span.issue == null;

  function handlePickIntensity(score) {
    setIntensity(score);
    setIntensityTouched(true);
  }

  function handleSave() {
    if (!canSave) return;
    // Todo campo tem que ser repassado: o `update` RECONSTRÓI o details, e o
    // que não vem SOME em silêncio (#328, #332).
    update(recordId, {
      unit: "min",
      note,
      score: intensityTouched ? intensity : loaded.score,
      training,
      cardio,
      ...tempo,
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      <ModalityRow
        training={training}
        cardio={cardio}
        onTraining={() => setTraining((v) => !v)}
        onCardio={() => setCardio((v) => !v)}
      />

      <TimeSpanFields
        span={span}
        fields={camposDoTreino({
          startTime,
          setStartTime,
          endTime,
          setEndTime,
          duration,
          setDuration,
          marcar,
        })}
        hint="dois campos quaisquer dão o terceiro"
      />

      <View>
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como foi
        </Text>
        <IntensityPills value={intensity} onChange={handlePickIntensity} />
      </View>

      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          OBS
        </Text>
        <NoteInput value={note} onChange={setNote} />
      </View>

      <PrimaryButton
        label="Salvar alterações"
        onPress={handleSave}
        disabled={!canSave}
        accessibilityLabel="Salvar alterações"
      />
    </View>
  );
}

/**
 * @param {{
 *   training: boolean,
 *   cardio: boolean,
 *   onTraining: () => void,
 *   onCardio: () => void,
 * }} props
 */
function ModalityRow({ training, cardio, onTraining, onCardio }) {
  return (
    <View className="flex-row gap-2.5">
      <ModalityChip
        label="Treino"
        hint="peso · força"
        selected={training}
        onPress={onTraining}
      />
      <ModalityChip
        label="Cardio"
        hint="corrida · bike"
        selected={cardio}
        onPress={onCardio}
      />
    </View>
  );
}

/** @param {{ value: number|null, onChange: (score: number) => void }} props */
function IntensityPills({ value, onChange }) {
  return (
    <View className="flex-row gap-2">
      {INTENSITY.map((i) => {
        const selected = value === i.score;
        return (
          <Pressable
            key={i.key}
            accessibilityRole="button"
            accessibilityLabel={`Intensidade: ${i.label}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(i.score)}
            className={`flex-1 items-center rounded-xl py-3 ${
              selected
                ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
                : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
            }`}
          >
            <Text
              className={`text-xs ${selected ? "text-primary dark:text-primary-dark" : "text-body-secondary dark:text-body-secondary-dark"}`}
              style={{
                fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
              }}
            >
              {i.label}
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
      placeholder="Observações sobre o exercício..."
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

/**
 * @param {{ label: string, hint: string, selected: boolean, onPress: () => void }} props
 */
function ModalityChip({ label, hint, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 rounded-2xl px-4 py-3 ${
        selected
          ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
          : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
      }`}
    >
      <Text
        className={`text-base ${selected ? "text-primary dark:text-primary-dark" : "text-body-secondary dark:text-body-secondary-dark"}`}
        style={{
          fontFamily: selected ? "Inter_600SemiBold" : "Inter_500Medium",
        }}
      >
        {label}
      </Text>
      <Text
        className={`text-xs ${selected ? "text-primary dark:text-primary-dark opacity-75" : "text-label dark:text-label-dark"}`}
        style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
      >
        {hint}
      </Text>
    </Pressable>
  );
}
