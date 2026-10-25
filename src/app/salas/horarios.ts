// Funções puras (sem banco, sem relógio próprio): fáceis de testar.
// Hoje o fuso de exibição é fixo. A reserva (etapa 3) vai mandar o fuso de
// forma explícita; aqui só mostramos horários de Brasília.
export const APP_TIMEZONE = "America/Sao_Paulo";

const DAY_MS = 24 * 60 * 60 * 1000;

export type BusyInterval = { startAt: Date; endAt: Date };

export type BusySlot = { start: string; end: string; endsNextDay: boolean };
export type DaySchedule = { key: string; label: string; busy: BusySlot[] };

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const labelFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

// "2026-10-25": o dia no fuso de exibição (não o dia em UTC).
function dayKey(date: Date): string {
  const parts = keyFormat.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function buildSchedule(
  busy: BusyInterval[],
  now: Date,
  days: number,
): DaySchedule[] {
  const schedule: DaySchedule[] = [];
  const byKey = new Map<string, DaySchedule>();

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() + i * DAY_MS);
    const key = dayKey(date);
    if (byKey.has(key)) continue;
    const entry: DaySchedule = { key, label: labelFormat.format(date), busy: [] };
    byKey.set(key, entry);
    schedule.push(entry);
  }

  const firstKey = schedule[0]?.key;
  const sorted = [...busy].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );
  for (const interval of sorted) {
    let key = dayKey(interval.startAt);
    // Começou antes do primeiro dia mostrado, mas ainda está valendo: entra no primeiro.
    if (firstKey && key < firstKey) key = firstKey;
    const entry = byKey.get(key);
    if (!entry) continue;
    entry.busy.push({
      start: timeFormat.format(interval.startAt),
      end: timeFormat.format(interval.endAt),
      endsNextDay: dayKey(interval.endAt) !== dayKey(interval.startAt),
    });
  }
  return schedule;
}
