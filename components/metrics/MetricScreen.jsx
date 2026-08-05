// Componente-base das telas de registro (M2, #80; faxinado pelo #256 fatia 5).
//
// Concentra o shell compartilhado: wrapper, Snackbar, ScrollView, card, header
// e a lista de histórico. O corpo do card é 100% do bespoke da métrica (via
// `renderCustom` do registry), que assume criação e edição.

import { useState } from "react";
import { ScrollView } from "react-native";
import { Snackbar } from "react-native-paper";

import MyViewRaw from "@/components/MyView";
import CardRaw from "@/components/Card";
import MetricRegisterHeaderRaw from "@/components/MetricRegisterHeader";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";
import { getMetricConfig } from "./registry";

const MyView = /** @type {any} */ (MyViewRaw);
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
  const { displayName, subtitle } = getCategoryInfo(metric);
  const config = getMetricConfig(metric);
  // Título capitalizado (design v2 mostra "Água" e não "água").
  const title = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const [date] = useState(getDate());
  const [reloadKey, setReloadKey] = useState(0);
  const [visible, setVisible] = useState(false);

  const { History, renderCustom, cardClass } = config;

  function afterSave() {
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

        {renderCustom && (
          <Card className={cardClass ?? ""}>
            {renderCustom({ onAfterAdd: afterSave, recordId })}
          </Card>
        )}

        <History tableName={metric} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
