// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTable } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import MyButton from "@/components/MyButton";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";
import { HistoryCard } from "@/components/MyHistory";

import { getByDate, store } from "@/infra/database";
import { CATEGORY_MAP, getCategoryInfo } from "@/components/categoryUtils";
//#endregion

// Ordem canônica das métricas (mesma da tela "hoje").
const METRICS = Object.keys(CATEGORY_MAP);

// Zera a hora pra comparar/derivar dias sem ruído de fuso — getByDate compara
// ano/mês/dia local, então o dia "cheio" é o suficiente.
function startOfDay(input) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(input, n) {
  const d = startOfDay(input);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export default function History() {
  const [date, setDate] = useState(() => startOfDay(new Date()));

  // Assina a tabela: re-renderiza a cada mudança nos registros (edição, exclusão
  // e também o fim do `startAutoLoad()` da persistência). Ler só no foco perdia
  // a carga inicial assíncrona — ver #108.
  const records = useTable("records", store);

  // Registros do dia agrupados por type (uma passada só, via getByDate).
  // `records` é gatilho de propósito (ver #108); remover a dep, como o
  // exhaustive-deps sugere, faria o histórico não atualizar ao excluir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const day = useMemo(() => getByDate(date.toISOString()), [date, records]);

  const isToday = isSameDay(date, new Date());
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Só as métricas com registro no dia, na ordem canônica.
  const sections = METRICS.filter((type) => (day[type]?.length ?? 0) > 0);

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
        {/* Navegação por data */}
        <Card className="gap-3">
          <SectionLabel>HISTÓRICO</SectionLabel>
          <View className="flex-row items-center justify-between gap-2">
            <MyButton
              title="◀"
              onPress={() => setDate((d) => addDays(d, -1))}
            />
            <Text className="flex-1 text-center font-bold text-base capitalize text-light-text dark:text-dark-text">
              {label}
            </Text>
            <MyButton
              title="▶"
              disabled={isToday}
              style={isToday ? { opacity: 0.4 } : undefined}
              onPress={() => setDate((d) => addDays(d, 1))}
            />
          </View>
          {!isToday && (
            <MyButton
              title="Hoje"
              onPress={() => setDate(startOfDay(new Date()))}
            />
          )}
        </Card>

        {/* Registros do dia, agrupados por métrica */}
        {sections.length === 0 ? (
          <Card className="items-center">
            <Text className="text-base text-light-text opacity-60 dark:text-dark-text">
              Nenhum registro neste dia.
            </Text>
          </Card>
        ) : (
          sections.map((type) => {
            const { displayName, unit } = getCategoryInfo(type);
            return (
              <MyView
                key={type}
                safe={false}
                className="w-full items-center gap-3"
              >
                {day[type].map((obj) => (
                  <HistoryCard
                    key={obj.id}
                    obj={obj}
                    tableName={type}
                    displayName={displayName}
                    unit={unit}
                    exercise={type === "exercise"}
                    hideDate
                    // Sem onChanged de propósito: o useTable acima já assina a
                    // store e re-renderiza quando um registro é excluído.
                  />
                ))}
              </MyView>
            );
          })
        )}
      </ScrollView>
    </MyView>
  );
}
