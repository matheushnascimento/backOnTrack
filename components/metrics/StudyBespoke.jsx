// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { add, getById, update } from "@/infra/database";
import getDate from "@/constants/getDate";
import { minutesToHHMM } from "@/constants/duration";
import { useThemeTokens } from "@/constants/themeTokens";
import { SPAN_NAMES, horaAgora, spanRecord } from "@/constants/timeSpan";

import TimerCard from "./TimerCard";
import TimeSpanFields, { useSpanEdits, useTimeSpan } from "./TimeSpanFields";

// UI bespoke da tela de estudo (M5-B fatia 2c, mockup 2a·6).
// Toggle "Feito" full-width com check → duração HH:MM (default "00:00") →
// pill de foco single-select (leitura/curso/prática/revisão/outro, opcional) →
// info card sereno → Registrar.
//
// `focus` é campo novo no modelo (opcional, string), e não quebra registros
// antigos porque o bespoke lê direto e o path legado sumiu com o #256.
//
// Fatia do estudo do #256: quando `recordId` chega (edição pelo HistoryCard), o
// componente troca pra <StudyEdit>: hidrata Feito/duração/foco/OBS do
// registro; salva via `update`. Score do registro é preservado (v2 create não
// define, v1 shell definia).
//
// #366: a tela ganhou início e fim. Eram ausentes aqui, e a duração era o
// único jeito de dizer quanto durou. Agora os três convivem pelo
// `reconcileTimes`, e `start`/`end` entram no registro quando informados.

const FOCUS = ["leitura", "curso", "prática", "revisão", "outro"];

/**
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function StudyBespoke({ onAfterAdd, recordId }) {
  if (recordId)
    return <StudyEdit recordId={recordId} onAfterSave={onAfterAdd} />;
  return <StudyCreate onAfterAdd={onAfterAdd} />;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
function StudyCreate({ onAfterAdd }) {
  const [studied, setStudied] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("");
  const [focus, setFocus] = useState(/** @type {string|null} */ (null));

  const { lastEdited, marcar, esquecer } = useSpanEdits();
  const span = useTimeSpan({
    start,
    end,
    duration,
    metric: "study",
    lastEdited,
  });
  const tempo = spanRecord(span, SPAN_NAMES.study);
  // Duração continua sendo o que define um registro de estudo, mas agora ela
  // pode vir dos horários. O `issue` já exclui o aviso do teto, que avisa e
  // deixa salvar.
  const canSave = studied && span.issue == null && tempo.quantity > 0;

  function handleSave() {
    if (!canSave) return;
    add("study", {
      date: getDate().ISOdate,
      unit: "min",
      studied,
      focus: focus ?? "",
      // Horários são opcionais aqui: quem só sabe que estudou 45min segue
      // registrando sem eles, e o §4.2 trata ausência como ausência.
      ...tempo,
    });
    setStudied(true);
    setStart("");
    setEnd("");
    setDuration("");
    setFocus(null);
    esquecer();
    onAfterAdd?.();
  }

  return (
    <View className="gap-4">
      <DoneToggle value={studied} onToggle={() => setStudied((v) => !v)} />

      {/* Timer (#369): parar preenche início e fim pelo mesmo caminho da
          digitação, e limpa a duração, pra ela não virar um terceiro campo
          em conflito com os horários do timer. */}
      <TimerCard
        metric="study"
        onStop={({ start: ini, end: fim }) => {
          marcar("start", setStart)(ini);
          marcar("end", setEnd)(fim);
          setDuration("");
        }}
      />

      <TimeSpanFields
        span={span}
        fields={camposDeTempo({
          start,
          setStart,
          end,
          setEnd,
          duration,
          setDuration,
          marcar,
        })}
        hint="quanto puder é suficiente"
      />

      <FocusPills value={focus} onChange={setFocus} />

      <View className="rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-4 py-3">
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          15 minutos já contam. Quando puder.
        </Text>
      </View>

      <PrimaryButton
        label="Registrar"
        onPress={handleSave}
        disabled={!canSave}
        accessibilityLabel="Registrar estudo"
      />
    </View>
  );
}

/**
 * Edição de um registro de estudo pelo HistoryCard. Hidrata Feito, duração,
 * foco e OBS do registro. Score do registro é preservado no save (o v2 create
 * não define, mas o v1 shell definia). Study nunca usou min/max/ideal.
 * @param {{ recordId: string, onAfterSave?: () => void }} props
 */
function StudyEdit({ recordId, onAfterSave }) {
  const [studied, setStudied] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("");
  const [focus, setFocus] = useState(/** @type {string|null} */ (null));
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    setLoaded(r);
    setStudied(r.studied != null ? !!r.studied : true);
    setStart(r.start ? String(r.start) : "");
    setEnd(r.end ? String(r.end) : "");
    setDuration(minutesToHHMM(r.quantity));
    setFocus(r.focus ? String(r.focus) : null);
    setNote(r.note ?? r.observation ?? "");
  }, [recordId]);

  const { lastEdited, marcar } = useSpanEdits();
  const span = useTimeSpan({
    start,
    end,
    duration,
    metric: "study",
    lastEdited,
  });
  const tempo = spanRecord(span, SPAN_NAMES.study);
  const canSave =
    loaded != null && studied && span.issue == null && tempo.quantity > 0;

  function handleSave() {
    if (!canSave) return;
    // Todo campo do registro tem que ser repassado aqui: o `update`
    // RECONSTRÓI o details, e o que não vem SOME em silêncio (#328, #332).
    update(recordId, {
      unit: "min",
      note,
      score: loaded.score,
      studied,
      focus: focus ?? "",
      ...tempo,
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      <DoneToggle value={studied} onToggle={() => setStudied((v) => !v)} />

      <TimeSpanFields
        span={span}
        fields={camposDeTempo({
          start,
          setStart,
          end,
          setEnd,
          duration,
          setDuration,
          marcar,
        })}
        hint="quanto puder é suficiente"
      />

      <FocusPills value={focus} onChange={setFocus} />

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
 * Descritores na ordem início → fim → duração, iguais nas duas telas (create e
 * edit), que é o que impedia as duas de divergirem como as métricas divergiram.
 */
function camposDeTempo({
  start,
  setStart,
  end,
  setEnd,
  duration,
  setDuration,
  marcar,
}) {
  return [
    {
      key: "start",
      label: "começou",
      placeholder: "19:00",
      value: start,
      onChange: marcar("start", setStart),
      agora: () => setStart(horaAgora()),
      agoraLabel: "agora",
    },
    {
      key: "end",
      label: "terminou",
      placeholder: "19:45",
      value: end,
      onChange: marcar("end", setEnd),
      agora: () => setEnd(horaAgora()),
      agoraLabel: "agora",
    },
    {
      key: "duration",
      label: "duração",
      placeholder: "0:45",
      value: duration,
      onChange: marcar("duration", setDuration),
    },
  ];
}

/** @param {{ value: boolean, onToggle: () => void }} props */
function DoneToggle({ value, onToggle }) {
  const t = useThemeTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Marcar como feito"
      accessibilityState={{ selected: value }}
      onPress={onToggle}
      className={`flex-row items-center justify-center gap-2.5 rounded-2xl py-4 ${
        value
          ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
          : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
      }`}
    >
      {value && (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 6L9 17l-5-5"
            stroke={t.primary}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
      <Text
        className={
          value
            ? "text-primary dark:text-primary-dark"
            : "text-body-secondary dark:text-body-secondary-dark"
        }
        style={{
          fontFamily: value ? "Inter_600SemiBold" : "Inter_500Medium",
          fontSize: 15,
        }}
      >
        Feito
      </Text>
    </Pressable>
  );
}

/** @param {{ value: string|null, onChange: (v: string|null) => void }} props */
function FocusPills({ value, onChange }) {
  return (
    <View className="mt-2">
      <Text
        className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        No que estudou
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {FOCUS.map((f) => {
          const selected = value === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={`Foco: ${f}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : f)}
              className={`rounded-full px-3.5 py-2 ${
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
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** @param {{ value: string, onChange: (v: string) => void }} props */
function NoteInput({ value, onChange }) {
  const t = useThemeTokens();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Observações sobre o estudo..."
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
