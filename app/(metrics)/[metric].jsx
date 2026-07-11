// Rota dinâmica das telas de registro (M2, #80).
//
// Substitui os 5 arquivos por-métrica (water/sleep/exercise/feeding/study). A
// navegação já era dinâmica (MyHeader/MyHistory usam `/(metrics)/<metric>`), e
// o modo edição chega por `?id=`. O `key={metric}` força um estado fresco ao
// trocar de métrica (o Expo Router reaproveita a instância da rota entre params
// iguais de segmento).

import { useLocalSearchParams } from "expo-router";

import MetricScreen from "@/components/metrics/MetricScreen";

export default function MetricRoute() {
  const params = useLocalSearchParams();
  const metric = String(params.metric ?? "");
  const recordId = params.id ? String(params.id) : undefined;

  return <MetricScreen key={metric} metric={metric} recordId={recordId} />;
}
