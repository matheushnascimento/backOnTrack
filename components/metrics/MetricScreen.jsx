// Componente-base das telas de registro (M2, #80).
//
// Concentra tudo que era idêntico nas 5 telas: o shell (wrapper, Snackbar,
// ScrollView, card, header, Nota, OBS, History), os states compartilhados e a
// máquina de submit/edição. O que varia por métrica vem da config (registry):
// os slots Top/Bottom, a serialização (buildData) e a leitura na edição
// (loadExtra). Adicionar uma métrica = adicionar uma config.

import { useEffect, useState } from "react";
import { ScrollView, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import ScoreRaw from "@/components/Score";
import MyViewRaw from "@/components/MyView";
import MyHeaderRaw from "@/components/MyHeader";
import FieldLabelRaw from "@/components/FieldLabel";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";
import { shadow } from "@/constants/Colors";
import { add, getById, update } from "@/infra/database";
import { getMetricConfig } from "./registry";

const MyView = /** @type {any} */ (MyViewRaw);
const Score = /** @type {any} */ (ScoreRaw);
const MyHeader = /** @type {any} */ (MyHeaderRaw);
const FieldLabel = /** @type {any} */ (FieldLabelRaw);

/**
 * @param {{ metric: string, recordId?: string }} props
 */
export default function MetricScreen({ metric, recordId }) {
  const { displayName, unit } = getCategoryInfo(metric);
  const config = getMetricConfig(metric);

  const [date] = useState(getDate());
  const [score, setScore] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const [extra, setExtra] = useState(() => ({ ...config.initialExtra }));

  /** @type {(key: string, value: any) => void} */
  function setField(key, value) {
    setExtra((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!recordId) return;
    const r = getById(recordId);
    if (!r) return;
    setScore(r.score);
    setObservation(r.note ?? r.observation ?? "");
    setExtra(config.loadExtra(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      unit,
      note: observation,
      score,
      ...config.buildData(extra),
    };
    if (recordId) update(recordId, data);
    else add(metric, data);
    setReloadKey((prev) => prev + 1);
  }

  const { Top, Bottom, History } = config;

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <MyHeader />
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        action={{ label: "Fechar", onPress: () => setVisible(false) }}
      >
        Registro salvo!
      </Snackbar>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          alignItems: "center",
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MyView
          safe={false}
          className={`max-w-[640px] gap-8 rounded-lg bg-light-backgroundCard p-3 dark:bg-dark-backgroundCard ${config.cardClass ?? ""}`}
          style={shadow}
        >
          <FieldLabel>
            {date.displayDate} {displayName}
          </FieldLabel>

          {Top && <Top extra={extra} setField={setField} />}

          <FieldLabel>Nota</FieldLabel>
          <Score value={score} onPress={setScore} />

          <MyView safe={false} className="gap-1">
            <FieldLabel>OBS:</FieldLabel>
            <TextInput
              value={observation}
              onChangeText={setObservation}
              className="h-16 rounded-lg bg-light-backgroundCard p-2 text-base font-normal text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
              placeholder={config.obsPlaceholder}
            />
          </MyView>

          {Bottom && (
            <Bottom
              extra={extra}
              setField={setField}
              onSubmit={handleSubmit}
              displayName={displayName}
              unit={unit}
            />
          )}
        </MyView>
        <History tableName={metric} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
