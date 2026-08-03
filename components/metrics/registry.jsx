// Registro de config por métrica (M2, #80).
//
// Cada métrica declara: o placeholder da OBS, o componente de histórico, o
// estado inicial dos campos específicos (extra), como ler um registro na edição
// (loadExtra), como serializar pro modelo unificado (buildData) e os slots
// Top/Bottom. O MetricScreen faz o resto (shell + submit + edição).

import { Text, TextInput } from "react-native";

import MyViewRaw from "@/components/MyView";
import MyButtonRaw from "@/components/MyButton";
import MyCheckboxRaw from "@/components/MyCheckbox";
import FieldLabelRaw from "@/components/FieldLabel";
import MyHistory, { MyExerciseHistory } from "@/components/MyHistory";
import WaterQuickAdd from "./WaterQuickAdd";

import { hhmmToMinutes, minutesToHHMM } from "@/constants/duration";
import {
  CounterField,
  DurationField,
  MinMaxIdealField,
  QuantityField,
} from "./fields";

const MyView = /** @type {any} */ (MyViewRaw);
const MyButton = /** @type {any} */ (MyButtonRaw);
const MyCheckbox = /** @type {any} */ (MyCheckboxRaw);
const FieldLabel = /** @type {any} */ (FieldLabelRaw);

const INPUT_LG =
  "h-[51px] w-20 max-w-[160px] rounded-md bg-light-backgroundCard dark:bg-dark-backgroundCard p-2 text-center text-2xl font-bold text-light-text dark:text-dark-text";

/**
 * @typedef {Object} SlotProps
 * @property {Record<string, any>} extra
 * @property {(key: string, value: any) => void} setField
 * @property {() => void} [onSubmit]
 * @property {string} [displayName]
 * @property {string} [unit]
 */

/**
 * @typedef {Object} MetricConfig
 * @property {string} obsPlaceholder
 * @property {any} History
 * @property {Record<string, any>} initialExtra
 * @property {(record: any) => Record<string, any>} loadExtra
 * @property {(extra: any) => Record<string, any>} buildData
 * @property {(props: SlotProps) => any} [Top]
 * @property {(props: SlotProps) => any} [Bottom]
 * @property {string} [cardClass]
 * @property {(props: { onAfterAdd: () => void }) => any} [renderCustom]  Se
 *   presente, substitui o corpo Score/OBS/Top/Bottom do card na criação de
 *   novos registros (recordId ausente). Edição via `?id=` cai no fluxo
 *   genérico. Usado por métricas com padrão bespoke (fatia 2a+ do M5-B).
 */

/** Slot MIN/MAX/IDEAL compartilhado por água e sono. @param {SlotProps} p */
function MinMaxIdealTop({ extra, setField }) {
  return (
    <MinMaxIdealField
      min={extra.min}
      max={extra.max}
      ideal={extra.ideal}
      onMin={(v) => setField("min", v)}
      onMax={(v) => setField("max", v)}
      onIdeal={(v) => setField("ideal", v)}
    />
  );
}

/** @type {Record<string, MetricConfig>} */
const REGISTRY = {
  water: {
    obsPlaceholder: "Observações sobre água...",
    History: MyHistory,
    // Estado inicial + loadExtra + buildData continuam usados no fluxo de
    // EDIÇÃO (recordId presente cai no shell genérico com o Top/Bottom).
    // Novos registros usam o `renderCustom` (WaterQuickAdd) abaixo.
    initialExtra: { quantity: "", min: "", max: "", ideal: "" },
    loadExtra: (r) => ({
      quantity: String(r.quantity ?? ""),
      min: r.min ?? "",
      max: r.max ?? "",
      ideal: r.ideal ?? "",
    }),
    buildData: (e) => ({
      quantity: Number(e.quantity) || 0,
      min: e.min,
      max: e.max,
      ideal: e.ideal,
    }),
    Top: MinMaxIdealTop,
    Bottom: ({ extra, setField, onSubmit, displayName, unit }) => (
      <MyView safe={false} className="gap-4">
        <QuantityField
          label={displayName ?? ""}
          value={extra.quantity}
          unit={unit ?? ""}
          onChange={(v) => setField("quantity", v)}
        />
        <MyButton title="Salvar" onPress={onSubmit} />
      </MyView>
    ),
    // Fatia 2a do M5-B: novos registros usam o UI bespoke (big number +
    // quick-add chips + lista de hoje). Ver components/metrics/WaterQuickAdd.jsx.
    renderCustom: ({ onAfterAdd }) => <WaterQuickAdd onAfterAdd={onAfterAdd} />,
  },

  sleep: {
    obsPlaceholder: "Observações sobre sono...",
    History: MyHistory,
    initialExtra: { hour: "", minute: "", min: "7", max: "", ideal: "8" },
    loadExtra: (r) => {
      const [hour, minute] = minutesToHHMM(r.quantity).split(":");
      return {
        hour,
        minute,
        min: r.min ?? "",
        max: r.max ?? "",
        ideal: r.ideal ?? "",
      };
    },
    buildData: (e) => ({
      quantity: hhmmToMinutes(`${e.hour ?? 0}:${e.minute ?? 0}`),
      min: e.min,
      max: e.max,
      ideal: e.ideal,
    }),
    Top: MinMaxIdealTop,
    Bottom: ({ extra, setField, onSubmit, displayName }) => (
      <MyView safe={false} className="gap-4">
        <MyView
          safe={false}
          className="w-full flex-row items-center justify-center gap-4 rounded-lg bg-light-backgroundCard p-3 dark:bg-dark-backgroundCard"
        >
          <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
            {displayName} hoje
          </Text>
          <TextInput
            className="h-[37px] max-w-[38px] rounded-md bg-light-backgroundCard dark:bg-dark-backgroundCard px-1 text-center text-xl font-normal text-light-text dark:text-dark-text"
            placeholder="--"
            value={extra.hour}
            onChangeText={(v) => setField("hour", v)}
          />
          <FieldLabel>h</FieldLabel>
          <TextInput
            className="h-[37px] max-w-[38px] rounded-md bg-light-backgroundCard dark:bg-dark-backgroundCard px-1 text-center text-xl font-normal text-light-text dark:text-dark-text"
            placeholder="--"
            value={extra.minute}
            onChangeText={(v) => setField("minute", v)}
          />
          <FieldLabel>min</FieldLabel>
        </MyView>
        <MyButton title="Salvar" onPress={onSubmit} />
      </MyView>
    ),
  },

  feeding: {
    obsPlaceholder: "Observações sobre refeições...",
    History: MyHistory,
    cardClass: "overflow-hidden",
    initialExtra: { count: 0 },
    loadExtra: (r) => ({ count: Number(r.quantity) || 0 }),
    buildData: (e) => ({ quantity: Number(e.count) || 0 }),
    Top: ({ extra, setField }) => (
      <CounterField
        count={extra.count}
        onAdd={() => setField("count", extra.count + 1)}
        onRemove={() => setField("count", extra.count - 1)}
      />
    ),
    Bottom: ({ onSubmit }) => <MyButton title="Salvar" onPress={onSubmit} />,
  },

  exercise: {
    obsPlaceholder: "Observações sobre o exercício...",
    History: MyExerciseHistory,
    initialExtra: {
      training: false,
      cardio: false,
      timeHour: "",
      timeMinute: "",
      durHour: "",
      durMinute: "",
    },
    loadExtra: (r) => {
      const [durHour, durMinute] = minutesToHHMM(r.quantity).split(":");
      const [timeHour, timeMinute] = String(r.trainingTime ?? ":").split(":");
      return {
        training: !!r.training,
        cardio: !!r.cardio,
        timeHour: timeHour ?? "",
        timeMinute: timeMinute ?? "",
        durHour,
        durMinute,
      };
    },
    buildData: (e) => ({
      quantity: hhmmToMinutes(`${e.durHour}:${e.durMinute}`),
      training: e.training,
      cardio: e.cardio,
      trainingTime: `${e.timeHour}:${e.timeMinute}`,
    }),
    Top: ({ extra, setField }) => (
      <MyView safe={false} className="gap-4">
        <MyCheckbox
          value={extra.training}
          label="Treino"
          onValueChange={() => setField("training", !extra.training)}
        />
        <MyCheckbox
          value={extra.cardio}
          label="Cardio"
          onValueChange={() => setField("cardio", !extra.cardio)}
        />
      </MyView>
    ),
    Bottom: ({ extra, setField, onSubmit }) => (
      <MyView safe={false} className="gap-4">
        <MyView
          safe={false}
          className="w-full items-center gap-8 rounded-lg bg-light-backgroundCard p-3 dark:bg-dark-backgroundCard"
        >
          <FieldLabel>Hora do treino</FieldLabel>
          <MyView
            safe={false}
            className="flex-row items-center justify-center gap-1"
          >
            <TextInput
              className={INPUT_LG}
              placeholder="--"
              value={extra.timeHour}
              onChangeText={(v) => setField("timeHour", v)}
            />
            <FieldLabel>:</FieldLabel>
            <TextInput
              className={INPUT_LG}
              placeholder="--"
              value={extra.timeMinute}
              onChangeText={(v) => setField("timeMinute", v)}
            />
          </MyView>
        </MyView>
        <DurationField
          label="Tempo de treino"
          hour={extra.durHour}
          minute={extra.durMinute}
          onHour={(v) => setField("durHour", v)}
          onMinute={(v) => setField("durMinute", v)}
        />
        <MyButton title="Salvar" onPress={onSubmit} />
      </MyView>
    ),
  },

  study: {
    obsPlaceholder: "Observações sobre o estudo...",
    History: MyHistory,
    initialExtra: { studied: false, durHour: "", durMinute: "" },
    loadExtra: (r) => {
      const [durHour, durMinute] = minutesToHHMM(r.quantity).split(":");
      return { studied: !!r.studied, durHour, durMinute };
    },
    buildData: (e) => ({
      quantity: hhmmToMinutes(`${e.durHour}:${e.durMinute}`),
      studied: e.studied,
    }),
    Top: ({ extra, setField }) => (
      <MyView safe={false} className="gap-4">
        <MyCheckbox
          value={extra.studied}
          label="Feito"
          onValueChange={() => setField("studied", !extra.studied)}
        />
      </MyView>
    ),
    Bottom: ({ extra, setField, onSubmit }) => (
      <MyView safe={false} className="gap-4">
        <DurationField
          label="Tempo de estudo"
          hour={extra.durHour}
          minute={extra.durMinute}
          onHour={(v) => setField("durHour", v)}
          onMinute={(v) => setField("durMinute", v)}
        />
        <MyButton title="Salvar" onPress={onSubmit} />
      </MyView>
    ),
  },
};

/** Config benigna pra métrica desconhecida — nunca quebra a tela. */
const FALLBACK = /** @type {MetricConfig} */ ({
  obsPlaceholder: "",
  History: MyHistory,
  initialExtra: {},
  loadExtra: () => ({}),
  buildData: () => ({ quantity: 0 }),
});

/**
 * @param {string} metric
 * @returns {MetricConfig}
 */
export function getMetricConfig(metric) {
  return REGISTRY[metric] ?? FALLBACK;
}
