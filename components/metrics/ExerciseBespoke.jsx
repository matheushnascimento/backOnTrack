// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { hhmmToMinutes, minutesToHHMM } from "@/constants/duration";
import { useThemeTokens } from "@/constants/themeTokens";

import TimeInput from "./TimeInput";

// UI bespoke da tela de exercício (M5-B fatia 2c, mockup 2a·4).
// Toggle Treino/Cardio (independentes) → duração HH:MM → hora de início
// opcional → intensidade (leve/ok/forte/puxado) mapeando pra score 2/3/4/5.
//
// Fatia do exercício do #256: quando `recordId` chega (edição pelo HistoryCard),
// o componente troca pra <ExerciseEdit> — hidrata modalidade, duração,
// trainingTime, intensidade e OBS do registro; salva via `update`. Score fora
// do range v2 (registros antigos com estrelas 0/1) fica sem pill selecionada e
// é preservado no save via `intensityTouched=false`.

const INTENSITY = [
  { key: "leve", label: "leve", score: 2 },
  { key: "ok", label: "ok", score: 3 },
  { key: "forte", label: "forte", score: 4 },
  { key: "puxado", label: "puxado", score: 5 },
];

function parseHHMM(s) {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
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
  const [intensity, setIntensity] = useState(/** @type {number|null} */ (null));

  const durationOk = useMemo(() => {
    const p = parseHHMM(duration);
    return p != null && p.h * 60 + p.min > 0;
  }, [duration]);
  const startTimeOk = useMemo(
    () => startTime === "" || parseHHMM(startTime) != null,
    [startTime],
  );

  const canSave =
    (training || cardio) && durationOk && startTimeOk && intensity != null;

  function handleSave() {
    if (!canSave) return;
    add("exercise", {
      date: getDate().ISOdate,
      unit: "min",
      quantity: hhmmToMinutes(duration),
      training,
      cardio,
      trainingTime: startTime,
      score: intensity,
    });
    setTraining(false);
    setCardio(false);
    setDuration("");
    setStartTime("");
    setIntensity(null);
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

      <FieldRow
        label="duração"
        value={duration}
        onChange={setDuration}
        placeholder="1:00"
        hint="obrigatório"
      />

      <FieldRow
        label="começou às"
        value={startTime}
        onChange={setStartTime}
        placeholder="18:30"
        hint="opcional"
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
    setNote(r.note ?? r.observation ?? "");
    if (INTENSITY.some((i) => i.score === r.score)) {
      setIntensity(r.score);
    }
  }, [recordId]);

  const durationOk = useMemo(() => {
    const p = parseHHMM(duration);
    return p != null && p.h * 60 + p.min > 0;
  }, [duration]);
  const startTimeOk = useMemo(
    () => startTime === "" || parseHHMM(startTime) != null,
    [startTime],
  );

  const canSave =
    loaded != null && (training || cardio) && durationOk && startTimeOk;

  function handlePickIntensity(score) {
    setIntensity(score);
    setIntensityTouched(true);
  }

  function handleSave() {
    if (!canSave) return;
    update(recordId, {
      unit: "min",
      quantity: hhmmToMinutes(duration),
      note,
      score: intensityTouched ? intensity : loaded.score,
      training,
      cardio,
      trainingTime: startTime,
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

      <FieldRow
        label="duração"
        value={duration}
        onChange={setDuration}
        placeholder="1:00"
        hint="obrigatório"
      />

      <FieldRow
        label="começou às"
        value={startTime}
        onChange={setStartTime}
        placeholder="18:30"
        hint="opcional"
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

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder: string,
 *   hint: string,
 * }} props
 */
function FieldRow({ label, value, onChange, placeholder, hint }) {
  const t = useThemeTokens();
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
      <View className="gap-0.5">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          {label}
        </Text>
        <TimeInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          accessibilityLabel={label}
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 24,
            color: t.ink,
            padding: 0,
            minWidth: 80,
          }}
        />
      </View>
      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {hint}
      </Text>
    </View>
  );
}
