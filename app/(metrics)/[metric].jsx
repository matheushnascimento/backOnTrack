// Rota dinâmica das telas de registro (M2, #80).
//
// Substitui os 5 arquivos por-métrica (water/sleep/exercise/feeding/study). A
// navegação já era dinâmica (MyHeader/MyHistory usam `/(metrics)/<metric>`), e
// o modo edição chega por `?id=`. A `key` força um estado fresco ao
// trocar de métrica (o Expo Router reaproveita a instância da rota entre params
// iguais de segmento).

import { useLocalSearchParams } from "expo-router";

import MetricScreen from "@/components/metrics/MetricScreen";

export default function MetricRoute() {
  const params = useLocalSearchParams();
  const metric = String(params.metric ?? "");
  const recordId = params.id ? String(params.id) : undefined;

  // O id entra na chave (#396): editar a partir do histórico da própria tela
  // reaproveitava a instância, e a rolagem ficava lá embaixo, onde estava o
  // cartão tocado, com o formulário de edição fora da vista lá em cima.
  return (
    <MetricScreen
      key={`${metric}:${recordId ?? ""}`}
      metric={metric}
      recordId={recordId}
    />
  );
}
