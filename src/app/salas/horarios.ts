// Funções puras (sem banco, sem relógio próprio): fáceis de testar.
// Hoje o fuso de exibição é fixo. A reserva (etapa 3) vai mandar o fuso de
// forma explícita; aqui só mostramos horários de Brasília.
export const APP_TIMEZONE = "America/Sao_Paulo";
// O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo.
// Se isso mudar, troque por uma biblioteca de fusos (ex.: Temporal).
export const APP_UTC_OFFSET = "-03:00";

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
export function dayKey(date: Date): string {
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

// Durações oferecidas no formulário: de 15 min a 4 h, de 15 em 15 (regras da API).
export const DURATION_OPTIONS_MIN = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Monta início e fim a partir do que a pessoa digitou (data, hora, duração),
 * sempre em horário de Brasília. Devolve null se a data/hora não existe.
 * O Date do JavaScript "arruma" datas impossíveis (30/02 vira 02/03), então
 * conferimos o dia de volta em vez de confiar no Date.
 */
export function buildWindow(
  date: string,
  time: string,
  durationMinutes: number,
): { startAt: Date; endAt: Date } | null {
  const startAt = new Date(`${date}T${time}:00${APP_UTC_OFFSET}`);
  if (Number.isNaN(startAt.getTime())) return null;
  if (dayKey(startAt) !== date) return null;
  return {
    startAt,
    endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
  };
}

// "segunda-feira, 26 de outubro, das 14:00 às 15:30"
export function describeWindow(startAt: Date, endAt: Date): string {
  return `${labelFormat.format(startAt)}, das ${timeFormat.format(startAt)} às ${timeFormat.format(endAt)}`;
}
