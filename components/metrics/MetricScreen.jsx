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
import FieldLabelRaw from "@/components/FieldLabel";
import CardRaw from "@/components/Card";
import MetricRegisterHeaderRaw from "@/components/MetricRegisterHeader";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";
import { add, getById, update } from "@/infra/database";
import { getMetricConfig } from "./registry";

const MyView = /** @type {any} */ (MyViewRaw);
const Score = /** @type {any} */ (ScoreRaw);
const FieldLabel = /** @type {any} */ (FieldLabelRaw);
const Card = /** @type {any} */ (CardRaw);
const MetricRegisterHeader = /** @type {any} */ (MetricRegisterHeaderRaw);

// Nav label mono. Sono ganha "NOITE PASSADA" na mockup (contexto do registro
// é a noite anterior); outras métricas usam "HOJE · <data>".
/** @param {string} metric @param {string} dateISO */
function navLabelFor(metric, dateISO) {
  if (metric === "sleep") return "NOITE PASSADA";
  const d = new Date(dateISO);
  const day = d.getDate();
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `HOJE · ${day} ${month}`.toUpperCase();
}

/**
 * @param {{ metric: string, recordId?: string }} props
 */
export default function MetricScreen({ metric, recordId }) {
  const { displayName, unit, subtitle } = getCategoryInfo(metric);
  const config = getMetricConfig(metric);
  // Título capitalizado (design v2 mostra "Água" e não "água").
  const title = displayName.charAt(0).toUpperCase() + displayName.slice(1);

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

  const { Top, Bottom, History, renderCustom } = config;
  // renderCustom substitui o corpo Score/OBS/Top/Bottom em NOVOS registros
  // (recordId ausente). Edição via `?id=` cai no fluxo genérico pra continuar
  // funcionando com os campos do modelo (min/max/ideal, duração, etc). Ver
  // typedef MetricConfig e docs/09-design-v2.md fatia 2a.
  const useCustom = !!renderCustom && !recordId;
  function afterAdd() {
    setVisible(true);
    setReloadKey((prev) => prev + 1);
  }

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
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
          padding: 20,
          gap: 20,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MetricRegisterHeader
          metric={metric}
          title={title}
          subtitle={subtitle}
          label={navLabelFor(metric, date.ISOdate)}
        />

        {useCustom ? (
          <Card className={config.cardClass ?? ""}>
            {renderCustom({ onAfterAdd: afterAdd })}
          </Card>
        ) : (
          <Card className={`gap-8 ${config.cardClass ?? ""}`}>
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
          </Card>
        )}
        <History tableName={metric} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
