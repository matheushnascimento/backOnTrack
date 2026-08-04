// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add } from "@/infra/database";
import getDate from "@/constants/getDate";
import { hhmmToMinutes } from "@/constants/duration";
import { useThemeTokens } from "@/constants/themeTokens";

// UI bespoke da tela de exercício (M5-B fatia 2c, mockup 2a·4).
// Toggle Treino/Cardio (independentes) → duração HH:MM → hora de início
// opcional → intensidade (leve/ok/forte/puxado) mapeando pra score 2/3/4/5.
// Nem OBS nem Nota — mockup omite; edição via ?id= volta pro genérico.

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
 * @param {{ onAfterAdd?: () => void }} props
 */
export default function ExerciseBespoke({ onAfterAdd }) {
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
      {/* Modalidade — toggles independentes (usuário pode marcar os dois) */}
      <View className="flex-row gap-2.5">
        <ModalityChip
          label="Treino"
          hint="peso · força"
          selected={training}
          onPress={() => setTraining((v) => !v)}
        />
        <ModalityChip
          label="Cardio"
          hint="corrida · bike"
          selected={cardio}
          onPress={() => setCardio((v) => !v)}
        />
      </View>

      {/* Duração */}
      <FieldRow
        label="duração"
        value={duration}
        onChange={setDuration}
        placeholder="1:00"
        hint="obrigatório"
      />

      {/* Hora de início (opcional) */}
      <FieldRow
        label="começou às"
        value={startTime}
        onChange={setStartTime}
        placeholder="18:30"
        hint="opcional"
      />

      {/* Intensidade */}
      <View className="mt-2">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como foi
        </Text>
        <View className="flex-row gap-2">
          {INTENSITY.map((i) => {
            const selected = intensity === i.score;
            return (
              <Pressable
                key={i.key}
                accessibilityRole="button"
                accessibilityLabel={`Intensidade: ${i.label}`}
                accessibilityState={{ selected }}
                onPress={() => setIntensity(i.score)}
                className={`flex-1 items-center rounded-xl py-3 ${
                  selected
                    ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
                    : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
                }`}
              >
                <Text
                  className={`text-xs ${selected ? "text-primary dark:text-primary-dark" : "text-body-secondary dark:text-body-secondary-dark"}`}
                  style={{
                    fontFamily: selected
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  }}
                >
                  {i.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Registrar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar exercício"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={handleSave}
        className={`mt-2 items-center rounded-2xl py-4 ${
          canSave
            ? "bg-primary dark:bg-primary-dark active:opacity-70"
            : "bg-border-strong dark:bg-border-strong-dark"
        }`}
      >
        <Text
          className="text-base text-white dark:text-on-primary-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Registrar
        </Text>
      </Pressable>
    </View>
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
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={t.iconDim}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
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
