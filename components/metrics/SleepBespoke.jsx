// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add } from "@/infra/database";
import getDate from "@/constants/getDate";
import { useThemeTokens } from "@/constants/themeTokens";

// UI bespoke da tela de sono (M5-B fatia 2b, mockup 2a·3 do Claude Design).
// Substitui o card Score/OBS/Top/Bottom da MetricScreen quando o registry
// aponta pra `renderCustom`. Padrão "noite passada":
//
//   [dormiu · 23:40]      domingo
//   [acordou · 07:00]     segunda
//   [Duração              7h 20min]  (tint azul)
//
//   COMO SE SENTE HOJE
//   [pouco] [ok] [bem] [ótimo]
//
//   [Registrar]
//
// Duração calculada auto (crossing midnight: (wake - bed + 1440) % 1440).
// Qualidade mapeia pra `score` (2/3/4/5) pra reusar a infra do histórico.

const QUALITY = [
  { key: "pouco", label: "pouco", score: 2 },
  { key: "ok", label: "ok", score: 3 },
  { key: "bem", label: "bem", score: 4 },
  { key: "otimo", label: "ótimo", score: 5 },
];

// "23:40" (string livre) -> minutos, ou null se inválido.
function parseHHMM(s) {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatDuration(min) {
  if (min == null) return "--";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// Rótulo do dia relativo. "hoje", "ontem", ou nome do dia da semana. Casa com
// o design que mostra "domingo"/"segunda" ao lado da hora.
function relativeDayLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  if (offset === 0) return "hoje";
  if (offset === -1) return "ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
export default function SleepBespoke({ onAfterAdd }) {
  // Sugestões padrão pra reduzir fricção: 23:00 / 07:00 (fica em placeholder).
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));

  const durationMin = useMemo(() => {
    const bed = parseHHMM(bedTime);
    const wake = parseHHMM(wakeTime);
    if (bed == null || wake == null) return null;
    return (wake - bed + 1440) % 1440;
  }, [bedTime, wakeTime]);

  const canSave = durationMin != null && durationMin > 0 && quality != null;

  function handleSave() {
    if (!canSave) return;
    add("sleep", {
      date: getDate().ISOdate,
      unit: "min",
      quantity: durationMin,
      score: quality,
    });
    setBedTime("");
    setWakeTime("");
    setQuality(null);
    onAfterAdd?.();
  }

  return (
    <View className="gap-4">
      {/* dormiu */}
      <TimeRow
        label="dormiu"
        value={bedTime}
        onChange={setBedTime}
        dayLabel={relativeDayLabel(-1)}
        placeholder="23:00"
      />

      {/* acordou */}
      <TimeRow
        label="acordou"
        value={wakeTime}
        onChange={setWakeTime}
        dayLabel={relativeDayLabel(0)}
        placeholder="07:00"
      />

      {/* duração calculada */}
      <View className="flex-row items-center justify-between rounded-2xl bg-tint-blue dark:bg-tint-blue-dark px-5 py-4">
        <Text
          className="text-sm text-primary dark:text-primary-dark"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Duração
        </Text>
        <Text
          className="text-primary dark:text-primary-dark"
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 22,
          }}
        >
          {formatDuration(durationMin)}
        </Text>
      </View>

      {/* qualidade */}
      <View className="mt-2">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Como se sente hoje
        </Text>
        <View className="flex-row gap-2">
          {QUALITY.map((q) => {
            const selected = quality === q.score;
            return (
              <Pressable
                key={q.key}
                accessibilityRole="button"
                accessibilityLabel={`Qualidade: ${q.label}`}
                accessibilityState={{ selected }}
                onPress={() => setQuality(q.score)}
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
                    fontFamily: selected
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  }}
                >
                  {q.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* registrar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar sono"
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
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (v: string) => void,
 *   dayLabel: string,
 *   placeholder: string,
 * }} props
 */
function TimeRow({ label, value, onChange, dayLabel, placeholder }) {
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
          accessibilityLabel={`Horário — ${label}`}
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
        {dayLabel}
      </Text>
    </View>
  );
}
