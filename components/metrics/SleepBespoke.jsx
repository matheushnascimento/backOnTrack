// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { minutesToHHMM } from "@/constants/duration";
import {
  durationFromTimes,
  parseHHMM,
  timesFrom,
} from "@/constants/sleepTimes";
import { formatGoal } from "@/constants/goals";
import { useThemeTokens } from "@/constants/themeTokens";

import TimePickerField from "./TimePickerField";

// Limita string de dígitos ao intervalo [0, max]. Usado nos inputs separados
// de hora/minuto do SleepEdit: vazio permanece vazio, valor acima do teto é
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
//   [mal] [ok] [bem] [ótimo]
//
//   [Registrar]
//
// Duração calculada auto (crossing midnight: (wake - bed + 1440) % 1440).
// Qualidade mapeia pra `score` (2/3/4/5) pra reusar a infra do histórico.
//
// Fatia do sono do #256: quando `recordId` chega (edição pelo HistoryCard), o
// componente troca pra <SleepEdit>.
//
// Desde a #328 o registro guarda `bed` e `wake` no `details`, e a edição mostra
// os mesmos dois campos de horário da criação. Registro gravado ANTES disso não
// tem os campos, e aí a edição cai no formulário de duração. Quem decide é o
// `timesFrom`, e os dois caminhos coexistem porque todo histórico existente é
// do formato antigo.
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

function formatDuration(min) {
  if (min == null) return "--";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
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

  const durationMin = useMemo(
    () => durationFromTimes(bedTime, wakeTime),
    [bedTime, wakeTime],
  );

  // Só o deitar é obrigatório (#349). O §4.2 do modelo separou os papéis:
  // deitar é o comportamento, acordar habilita a duração, e qualidade é
  // percepção. Exigir os três contraria o comportamento que se quer repetir.
  const canSave = parseHHMM(bedTime) != null;

  function handleSave() {
    if (!canSave) return;
    add("sleep", {
      date: getDate().ISOdate,
      unit: "min",
      // Duração é DESFECHO (§4.2), e só existe quando houve acordar. Zero
      // aqui significa "não informado", e a Home trata isso mostrando o
      // horário de deitar em vez de formatar zero como "0:00".
      quantity: durationMin ?? 0,
      // Os horários vão junto (#328). Antes morriam aqui, e a edição só
      // conseguia oferecer duração porque o dado não existia.
      bed: bedTime,
      ...(wakeTime ? { wake: wakeTime } : {}),
      ...(quality != null ? { score: quality } : {}),
    });
    setBedTime("");
    setWakeTime("");
    setQuality(null);
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
      <TimeRow
        label="deitou"
        value={bedTime}
        onChange={setBedTime}
        placeholder="23:00"
        onAgora={() => setBedTime(horaAgora())}
        agoraLabel="deitar agora"
      />

      {/* acordou, opcional */}
      <TimeRow
        label="acordou (opcional)"
        value={wakeTime}
        onChange={setWakeTime}
        placeholder="07:00"
      />

      {/* Duração só aparece quando há acordar. Ela é desfecho, e mostrar
          "--" o tempo todo transformaria um campo opcional em cobrança. A
          faixa vem junto como REFERÊNCIA DE LEITURA, e não como meta. */}
      {durationMin != null ? (
        <View className="gap-1 rounded-2xl bg-tint-blue dark:bg-tint-blue-dark px-5 py-4">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-sm text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Duração
            </Text>
            <Text
              className="text-primary dark:text-primary-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 22 }}
            >
              {formatDuration(durationMin)}
            </Text>
          </View>
          <Text
            className="text-xs text-primary dark:text-primary-dark opacity-70"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            suficiente costuma ser {formatGoal("sleep")}
          </Text>
        </View>
      ) : null}

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
 * Edição de um registro de sono pelo HistoryCard.
 *
 * Dois modos, decididos pelo dado e não por preferência: registro com `bed` e
 * `wake` edita horário, e a duração acompanha; registro antigo edita duração
 * direto, porque os horários dele nunca foram gravados.
 *
 * Score fora do range QUALITY (registros antigos) preserva-se se a pill não
 * for tocada. Legacy min/max/ideal também são preservados.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function SleepEdit({ recordId, onAfterSave }) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [porHorario, setPorHorario] = useState(false);
  const [note, setNote] = useState("");
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));
  const [qualityTouched, setQualityTouched] = useState(false);
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    // O dado decide o formulário. Registro sem horário é o histórico inteiro
    // anterior à #328, então este ramo não é exceção rara.
    const horarios = timesFrom(r);
    if (horarios) {
      setPorHorario(true);
      setBedTime(horarios.bed);
      setWakeTime(horarios.wake);
    }
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
  const duracaoPorHorario = durationFromTimes(bedTime, wakeTime);
  const totalMin = porHorario
    ? (duracaoPorHorario ?? 0)
    : parsedH * 60 + parsedM;
  const canSave =
    loaded != null &&
    totalMin > 0 &&
    (porHorario || (parsedH >= 0 && parsedM >= 0 && parsedM < 60));

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
      // Só reescreve os horários no modo que os edita. No modo duração eles
      // não existem, e gravar string vazia faria o `timesFrom` continuar
      // devolvendo null sem motivo aparente.
      ...(porHorario ? { bed: bedTime, wake: wakeTime } : {}),
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      {porHorario ? (
        <>
          {/* Mesmos campos da criação: corrigir "acordei 07:10" é o que a
              pessoa quer fazer, em vez de recalcular a duração de cabeça. */}
          <TimeRow
            label="dormiu"
            value={bedTime}
            onChange={setBedTime}
            placeholder="23:00"
          />
          <TimeRow
            label="acordou"
            value={wakeTime}
            onChange={setWakeTime}
            placeholder="07:00"
          />
          <View className="flex-row items-center justify-between rounded-2xl bg-tint-blue dark:bg-tint-blue-dark px-5 py-4">
            <Text
              className="text-sm text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Duração
            </Text>
            <Text
              className="text-primary dark:text-primary-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium", fontSize: 22 }}
            >
              {formatDuration(duracaoPorHorario)}
            </Text>
          </View>
        </>
      ) : (
        /* Registro anterior à #328: os horários nunca foram gravados, então
           editar duração direto é o único formulário honesto. */
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
      )}

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
 *   placeholder: string,
 * }} props
 */
function TimeRow({ label, value, onChange, placeholder, onAgora, agoraLabel }) {
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
          accessibilityLabel={`Horário: ${label}`}
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 24,
            color: t.ink,
            padding: 0,
            minWidth: 80,
          }}
        />
      </View>
      <View className="items-end">
        {/* Atalho do momento do comportamento: um toque na hora de deitar
            registra o horário exato, em vez de depender de lembrar depois. */}
        {onAgora ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={agoraLabel}
            onPress={onAgora}
            className="rounded-full border border-primary dark:border-primary-dark px-3 py-1 active:opacity-70"
          >
            <Text
              className="text-xs text-primary dark:text-primary-dark"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {agoraLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** "HH:MM" de agora, pro atalho da linha do deitar. */
function horaAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
