// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
// Agregador semanal para a tela Semana (M5-B fatia 3, mockup 2a·7).
//
// Uma passada única na tabela pra montar:
//   - dias: [{ date, weekday, isToday, metrics: {water: N, ...}, filledCount, complete }]
//   - porMetric: {water: {days, ...}, sleep: {avgMin}, exercise: {sessions}, ...}
//   - resumo: { activeDays, weekLabel }
//
// Range: últimos 7 dias incluindo hoje (rolling), pra HOJE aparecer sempre no
// último slot. Header exibe o número da semana ISO da data de hoje pra dar
// contexto — não é o range ISO Mon-Sun (que seria confuso quando o rolling
// atravessa duas semanas).

import { store } from "@/infra/database";

const METRICS = ["water", "sleep", "exercise", "feeding", "study"];
const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_ABBR = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

// ISO 8601 week number. Cópia direta do algoritmo canônico — não vale trazer
// date-fns só pra isso.
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateAt(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// "5–11 ago" (mesmo mês) ou "29 jul–4 ago" (cruza mês).
function formatRange(start, end) {
  const sM = MONTH_ABBR[start.getMonth()];
  const eM = MONTH_ABBR[end.getMonth()];
  if (sM === eM) return `${start.getDate()}–${end.getDate()} ${eM}`;
  return `${start.getDate()} ${sM}–${end.getDate()} ${eM}`;
}

function copyForActiveDays(n) {
  if (n === 0) return "Sem registros nesta semana. Sem pressa.";
  if (n === 1) return "1 dia com registro nesta semana.";
  if (n <= 3) return `${n} dias com registro nesta semana.`;
  if (n <= 5) return `${n} dias com pelo menos um registro.`;
  return `${n} dias com pelo menos um registro. Bom ritmo.`;
}

/**
 * @returns {{
 *   days: Array<{ date: Date, weekdayLabel: string, isToday: boolean, filledMetrics: string[], complete: boolean }>,
 *   perMetric: Record<string, { label: string, stat: string }>,
 *   header: { weekLabel: string, title: string, subtitle: string },
 * }}
 */
export function summarizeWeek() {
  // 7 dias, do mais antigo pro mais recente (hoje no fim).
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = dateAt(6 - i);
    return {
      date: d,
      weekdayLabel: WEEKDAY_LABELS[d.getDay()],
      isToday: i === 6,
      filledMetrics: /** @type {string[]} */ ([]),
      complete: false,
    };
  });

  // Agregações por métrica na janela.
  const perMetricRaw = {
    water: { totalMl: 0, daysActive: new Set() },
    sleep: { minutes: [], daysActive: new Set() },
    exercise: { sessions: 0, daysActive: new Set() },
    feeding: { count: 0, daysActive: new Set() },
    study: { minutes: 0, daysActive: new Set() },
  };

  const linhas = store.getTable("records");
  const cutoff = days[0].date;
  const cutoffMs = cutoff.getTime();

  for (const row of Object.values(linhas)) {
    if (!row.date || !row.type) continue;
    const d = new Date(row.date);
    if (d.getTime() < cutoffMs) continue;
    // Ache o dia correspondente na janela.
    const dayIdx = days.findIndex((day) => sameDay(day.date, d));
    if (dayIdx < 0) continue;
    const day = days[dayIdx];
    if (!day.filledMetrics.includes(row.type)) day.filledMetrics.push(row.type);

    const q = Number(row.quantity) || 0;
    const key = day.date.toISOString().slice(0, 10);
    switch (row.type) {
      case "water":
        perMetricRaw.water.totalMl += q;
        perMetricRaw.water.daysActive.add(key);
        break;
      case "sleep":
        perMetricRaw.sleep.minutes.push(q);
        perMetricRaw.sleep.daysActive.add(key);
        break;
      case "exercise":
        perMetricRaw.exercise.sessions += 1;
        perMetricRaw.exercise.daysActive.add(key);
        break;
      case "feeding":
        perMetricRaw.feeding.count += q;
        perMetricRaw.feeding.daysActive.add(key);
        break;
      case "study":
        perMetricRaw.study.minutes += q;
        perMetricRaw.study.daysActive.add(key);
        break;
    }
  }

  // Marca completos.
  for (const day of days) {
    day.complete = day.filledMetrics.length >= METRICS.length;
  }

  const activeDays = days.filter((d) => d.filledMetrics.length > 0).length;

  // Header.
  const today = new Date();
  const weekLabel =
    `SEM ${isoWeek(today)} · ${formatRange(days[0].date, days[6].date)}`.toUpperCase();

  // Per-metric stats (formatação já pronta pra render).
  const perMetric = {
    water: {
      label: "Água",
      stat: `${perMetricRaw.water.daysActive.size}/7 dias`,
    },
    sleep: {
      label: "Sono",
      stat:
        perMetricRaw.sleep.minutes.length === 0
          ? "sem registros"
          : `média ${formatMinutes(avg(perMetricRaw.sleep.minutes))}`,
    },
    exercise: {
      label: "Exercício",
      stat:
        perMetricRaw.exercise.sessions === 0
          ? "sem sessões"
          : `${perMetricRaw.exercise.sessions} ${perMetricRaw.exercise.sessions === 1 ? "sessão" : "sessões"}`,
    },
    feeding: {
      label: "Alimentação",
      stat:
        perMetricRaw.feeding.count === 0
          ? "sem refeições"
          : `${perMetricRaw.feeding.count} ${perMetricRaw.feeding.count === 1 ? "refeição" : "refeições"}`,
    },
    study: {
      label: "Estudo",
      stat:
        perMetricRaw.study.minutes === 0
          ? "sem estudo"
          : `${formatMinutes(perMetricRaw.study.minutes)} total`,
    },
  };

  return {
    days,
    perMetric,
    header: {
      weekLabel,
      title: "Sua semana",
      subtitle: copyForActiveDays(activeDays),
    },
  };
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function formatMinutes(min) {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export const METRIC_KEYS_ORDER = METRICS;
