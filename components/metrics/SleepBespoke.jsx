// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { minutesToHHMM } from "@/constants/duration";
import { useThemeTokens } from "@/constants/themeTokens";

import TimePickerField from "./TimePickerField";

// Limita string de dígitos ao intervalo [0, max]. Usado nos inputs separados
// de hora/minuto do SleepEdit — vazio permanece vazio, valor acima do teto é
// truncado pro teto (usuário tenta digitar "99" na hora, vira "23").
function clampNumString(s, max) {
  const digits = String(s ?? "").replace(/\D/g, "");
  if (digits === "") return "";
  const n = parseInt(digits, 10);
  if (n > max) return String(max);
  return digits;
}

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
//
// Fatia do sono do #256: quando `recordId` chega (edição pelo HistoryCard), o
// componente troca pra <SleepEdit> — o registro só guarda duração + score, não
// bed/wake times, então a edição mostra duração (h/min) + qualidade + OBS.
// Score fora do range QUALITY (registros antigos com estrelas 0-5) fica sem
// pill selecionada e o valor original é preservado no save se o usuário não
// tocar. Legacy min/max/ideal também são preservados.

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
 * Edição de um registro de sono pelo HistoryCard. O registro só guarda duração
 * + score, então a edição opera nesses campos (não em bed/wake times).
 * Score fora do range QUALITY (registros antigos) preserva-se se a pill não
 * for tocada. Legacy min/max/ideal também são preservados.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function SleepEdit({ recordId, onAfterSave }) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [note, setNote] = useState("");
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));
  const [qualityTouched, setQualityTouched] = useState(false);
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    const [h, m] = minutesToHHMM(r.quantity).split(":");
    setHour(h);
    setMinute(m);
    setNote(r.note ?? r.observation ?? "");
    // Só pré-seleciona a pill se o score bater com os valores canônicos v2.
    // Scores fora disso (registros antigos com 0/1) ficam sem pill mas são
    // preservados no save via qualityTouched=false.
    if (QUALITY.some((q) => q.score === r.score)) {
      setQuality(r.score);
    }
  }, [recordId]);

  const parsedH = Number(hour) || 0;
  const parsedM = Number(minute) || 0;
  const totalMin = parsedH * 60 + parsedM;
  const canSave =
    loaded != null &&
    totalMin > 0 &&
    parsedH >= 0 &&
    parsedM >= 0 &&
    parsedM < 60;

  function handlePickQuality(score) {
    setQuality(score);
    setQualityTouched(true);
  }

  function handleSave() {
    if (!canSave) return;
    update(recordId, {
      unit: "min",
      quantity: totalMin,
      note,
      score: qualityTouched ? quality : loaded.score,
      min: loaded.min,
      max: loaded.max,
      ideal: loaded.ideal,
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      {/* Duração */}
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Text
          className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          Duração
        </Text>
        <View className="flex-row items-baseline gap-2">
          <DurationInput
            value={hour}
            onChange={(v) => setHour(clampNumString(v, 23))}
            accessibilityLabel="Horas"
            maxLength={2}
          />
          <UnitLabel>h</UnitLabel>
          <DurationInput
            value={minute}
            onChange={(v) => setMinute(clampNumString(v, 59))}
            accessibilityLabel="Minutos"
            maxLength={2}
          />
          <UnitLabel>min</UnitLabel>
        </View>
      </View>

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

/**
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   accessibilityLabel: string,
 *   maxLength: number,
 * }} props
 */
function DurationInput({ value, onChange, accessibilityLabel, maxLength }) {
  const t = useThemeTokens();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="0"
      placeholderTextColor={t.iconDim}
      keyboardType="numeric"
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel}
      style={{
        fontFamily: "JetBrainsMono_500Medium",
        fontSize: 32,
        color: t.ink,
        padding: 0,
        minWidth: 44,
      }}
    />
  );
}

/** @param {{ children: any }} props */
function UnitLabel({ children }) {
  return (
    <Text
      className="text-label dark:text-label-dark"
      style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 18 }}
    >
      {children}
    </Text>
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
        <TimePickerField
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
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
