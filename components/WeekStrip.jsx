// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Text, View } from "react-native";

// Faixa visual dos últimos 7 dias (M5-B fatia 3, mockup 2a·7).
// Cada dia = coluna com stack vertical de barrinhas: 1 por métrica registrada.
// Se todas as 5 métricas foram registradas, a barra do topo vira verde
// (`brand-green`). Dia sem registros mostra 1 barra cinza-claro (vazio).
// Legenda embaixo explica as cores.

const MAX_METRICS = 5;
const BAR_HEIGHT = 12;
const BAR_GAP = 2;
const STACK_HEIGHT = MAX_METRICS * BAR_HEIGHT + (MAX_METRICS - 1) * BAR_GAP; // 68

/**
 * @param {{ days: Array<{
 *   date: Date,
 *   weekdayLabel: string,
 *   isToday: boolean,
 *   filledMetrics: string[],
 *   complete: boolean,
 * }> }} props
 */
export default function WeekStrip({ days }) {
  return (
    <View className="rounded-2xl border border-border-subtle bg-white p-4">
      <View
        className="flex-row items-end justify-between"
        style={{ height: STACK_HEIGHT + 24 }}
      >
        {days.map((day, i) => (
          <DayColumn key={i} day={day} />
        ))}
      </View>

      {/* Legend */}
      <View className="mt-4 flex-row gap-3 border-t border-surface-subtle pt-3">
        <LegendItem color="#2E5A88" label="registro" />
        <LegendItem color="#4CAF50" label="dia completo" />
        <LegendItem color="#E5E7EB" label="vazio" />
      </View>
    </View>
  );
}

/** @param {{ day: { weekdayLabel: string, isToday: boolean, filledMetrics: string[], complete: boolean } }} props */
function DayColumn({ day }) {
  const filled = day.filledMetrics.length;
  const isEmpty = filled === 0;

  // Uma barrinha por métrica registrada; topo verde se completo. Se vazio,
  // uma barra cinza placeholder.
  const bars = isEmpty
    ? [{ color: "#E5E7EB", key: "empty" }]
    : Array.from({ length: filled }, (_, i) => ({
        color: day.complete && i === filled - 1 ? "#4CAF50" : "#2E5A88",
        key: `bar-${i}`,
      }));

  return (
    <View className="flex-1 items-center" style={{ gap: 6 }}>
      <View
        className="justify-end"
        style={{ height: STACK_HEIGHT, gap: BAR_GAP }}
      >
        {bars.map((b) => (
          <View
            key={b.key}
            style={{
              width: day.isToday ? 20 : 18,
              height: day.isToday ? BAR_HEIGHT + 2 : BAR_HEIGHT,
              backgroundColor: b.color,
              borderRadius: 2,
              // Ring azul lavado ao redor das barras de HOJE, sem sombra
              // (shadow* prop no Android é caro; borderColor + borderWidth
              // reproduz o efeito com custo zero).
              ...(day.isToday && {
                borderWidth: 2,
                borderColor: "#EAF3FB",
              }),
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: 10,
          color: day.isToday ? "#2E5A88" : "#6B7280",
          fontWeight: day.isToday ? "700" : "500",
        }}
      >
        {day.isToday ? "HOJE" : day.weekdayLabel}
      </Text>
    </View>
  );
}

/** @param {{ color: string, label: string }} props */
function LegendItem({ color, label }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 2 }}
      />
      <Text
        className="text-xs text-label"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
    </View>
  );
}
