// Campos reutilizáveis das telas de registro (M2, #80).
//
// Cada tela de métrica compõe estes campos nos slots topo/baixo do
// MetricScreen. Os componentes legados (MyView, MyButton) são @ts-nocheck e
// têm assinatura inferida com props "obrigatórias"; aqui eles entram como any
// na fronteira (padrão do Ciclo 3), enquanto as props destes campos são
// tipadas de verdade.

import { Text, TextInput } from "react-native";

import MyViewRaw from "@/components/MyView";
import FieldLabelRaw from "@/components/FieldLabel";
import { MyIconButton as MyIconButtonRaw } from "@/components/MyButton";

const MyView = /** @type {any} */ (MyViewRaw);
const MyIconButton = /** @type {any} */ (MyIconButtonRaw);
const FieldLabel = /** @type {any} */ (FieldLabelRaw);

const INPUT_LG =
  "h-[51px] w-20 max-w-[160px] rounded-md bg-light-backgroundCard dark:bg-dark-backgroundCard p-2 text-center text-2xl font-bold text-light-text dark:text-dark-text";
const CARD =
  "w-full items-center gap-8 rounded-lg bg-light-backgroundCard p-3 dark:bg-dark-backgroundCard";

/**
 * Bloco MIN / MAX / IDEAL (água, sono). Os três campos são editáveis — isso
 * corrige o bug do sono, onde MIN e IDEAL não tinham onChangeText.
 * @param {{
 *   min: string, max: string, ideal: string,
 *   onMin: (v: string) => void,
 *   onMax: (v: string) => void,
 *   onIdeal: (v: string) => void,
 * }} props
 */
export function MinMaxIdealField({ min, max, ideal, onMin, onMax, onIdeal }) {
  const inputClass =
    "max-w-[160px] rounded-md bg-light-backgroundCard p-2 text-2xl font-bold text-light-text dark:bg-dark-backgroundCard dark:text-dark-text";
  const cols = [
    { label: "MIN", value: min, onChange: onMin },
    { label: "MAX", value: max, onChange: onMax },
    { label: "IDEAL", value: ideal, onChange: onIdeal },
  ];
  return (
    <MyView safe={false} className="flex-row justify-between">
      {cols.map((col) => (
        <MyView key={col.label} safe={false} className="gap-3">
          <FieldLabel>{col.label}</FieldLabel>
          <TextInput
            className={inputClass}
            placeholder="--"
            value={col.value}
            onChangeText={col.onChange}
          />
        </MyView>
      ))}
    </MyView>
  );
}

/**
 * Card de duração em HH:MM com rótulos h/min (exercício e estudo).
 * @param {{
 *   label: string, hour: string, minute: string,
 *   onHour: (v: string) => void,
 *   onMinute: (v: string) => void,
 * }} props
 */
export function DurationField({ label, hour, minute, onHour, onMinute }) {
  return (
    <MyView safe={false} className={CARD}>
      <FieldLabel>{label}</FieldLabel>
      <MyView safe={false} className="flex-row items-end gap-1">
        <TextInput
          className={INPUT_LG}
          placeholder="--"
          value={hour}
          onChangeText={onHour}
        />
        <FieldLabel>h</FieldLabel>
        <TextInput
          className={INPUT_LG}
          placeholder="--"
          value={minute}
          onChangeText={onMinute}
        />
        <FieldLabel>min</FieldLabel>
      </MyView>
    </MyView>
  );
}

/**
 * Contador +/- (alimentação). Cada refeição é um botão selecionado; o último
 * botão adiciona.
 * @param {{ count: number, onAdd: () => void, onRemove: () => void }} props
 */
export function CounterField({ count, onAdd, onRemove }) {
  return (
    <MyView safe={false} className="gap-4">
      <MyView safe={false} className="flex-row gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <MyIconButton
            key={index}
            value={index}
            compact="true"
            isSelected={true}
            onPress={onRemove}
          />
        ))}
        <MyIconButton onPress={onAdd} compact="true" />
      </MyView>
    </MyView>
  );
}

/**
 * Card "{label} hoje" com um número e a unidade (água).
 * @param {{
 *   label: string, value: string, unit: string,
 *   onChange: (v: string) => void,
 * }} props
 */
export function QuantityField({ label, value, unit, onChange }) {
  return (
    <MyView
      safe={false}
      className="w-full flex-row items-center justify-center gap-8 rounded-lg bg-light-backgroundCard p-3 dark:bg-dark-backgroundCard"
    >
      <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
        {label} hoje
      </Text>
      <TextInput
        className="h-[51px] w-20 rounded-md bg-light-backgroundCard p-2 text-center text-2xl font-bold text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
        placeholder="--"
        value={value}
        onChangeText={onChange}
      />
      <FieldLabel>{unit}</FieldLabel>
    </MyView>
  );
}
