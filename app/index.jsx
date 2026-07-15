// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { useTable } from "tinybase/ui-react";

import MyButton from "@/components/MyButton";
import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import InstallApp from "@/components/InstallApp";

import { clearAll, getToday, store } from "@/infra/database";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
import { shadow } from "@/constants/Colors";
//#endregion

const CARD =
  "w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard";
const LABEL =
  "font-bold text-xs text-light-text opacity-60 dark:text-dark-text";

const METRICS = Object.keys(CATEGORY_MAP);
const TOTAL = METRICS.length;

// Total do dia formatado por unidade: minutos -> HH:MM; refeição pluraliza;
// o resto (ml) sai cru com a unidade.
function formatTotal(unit, total) {
  if (unit === "min") return minutesToHHMM(total);
  if (unit === "refeição")
    return `${total} ${total === 1 ? "refeição" : "refeições"}`;
  return `${total} ${unit}`;
}

function MetricRow({ done, name, detail }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base">{done ? "✅" : "⬜"}</Text>
      <Text className="flex-1 text-base text-light-text dark:text-dark-text">
        {name}
      </Text>
      <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
        {detail}
      </Text>
    </View>
  );
}

export default function Home() {
  const { toggleColorScheme } = useColorScheme();

  // Assina a tabela: `useTable` re-renderiza a cada mudança nos registros —
  // inclusive quando o `startAutoLoad()` da persistência termina de carregar.
  // Ler só no foco (o padrão anterior) perdia essa carga: no primeiro load a
  // tela lia a store ainda vazia e nunca era avisada quando os dados chegavam,
  // então a Home só mostrava algo depois de ir a outra tela e voltar (#108).
  const records = useTable("records", store);
  const today = useMemo(() => getToday(), [records]);

  function handleClear() {
    Alert.alert(
      "Limpar todos os dados",
      "Isso apaga todos os registros. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          // A assinatura da store cuida do re-render; não precisa reler na mão.
          onPress: clearAll,
        },
      ],
    );
  }

  const rows = METRICS.map((type) => {
    const { displayName, unit } = CATEGORY_MAP[type];
    const registros = today[type] ?? [];
    const total = registros.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const done = registros.length > 0;
    return {
      type,
      name: displayName,
      done,
      detail: done ? `${formatTotal(unit, total)} · ${registros.length}×` : "—",
    };
  });

  const registradas = rows.filter((r) => r.done).length;
  const pct = Math.round((registradas / TOTAL) * 100);
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <MyHeader />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo do dia */}
        <MyView safe={false} className={`${CARD} gap-2`} style={shadow}>
          <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
            Hoje
          </Text>
          <Text className="font-bold text-base text-light-text opacity-60 dark:text-dark-text">
            {dataHoje} · {registradas} de {TOTAL} métricas registradas
          </Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-light-background dark:bg-dark-background">
            <View
              className="h-2 rounded-full bg-secondary"
              style={{ width: `${pct}%` }}
            />
          </View>
        </MyView>

        {/* Métricas do dia */}
        <MyView safe={false} className={`${CARD} gap-3`} style={shadow}>
          <Text className={LABEL}>MÉTRICAS DE HOJE</Text>
          <MyView safe={false} className="gap-2">
            {rows.map((r) => (
              <MetricRow
                key={r.type}
                done={r.done}
                name={r.name}
                detail={r.detail}
              />
            ))}
          </MyView>
        </MyView>

        {/* Obter o app (só web: QR no desktop, download no celular) */}
        <InstallApp />

        {/* Utilitários */}
        <MyView safe={false} className={`${CARD} gap-2`} style={shadow}>
          <Text className={LABEL}>UTILITÁRIOS</Text>
          <MyButton title="Alternar tema" onPress={() => toggleColorScheme()} />
          <MyButton
            title="Histórico"
            onPress={() => router.navigate("/history")}
          />
          <MyButton title="Limpar todos os dados" onPress={handleClear} />
          <MyButton
            title="Enviar feedback"
            onPress={() => router.navigate("/feedback")}
          />
          <MyButton
            title="Roadmap do projeto"
            onPress={() => router.navigate("/roadmap")}
          />
        </MyView>
      </ScrollView>
    </MyView>
  );
}
