const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const SLOT_MS = 15 * MINUTE;
export const MIN_DURATION_MS = 15 * MINUTE;
export const MAX_DURATION_MS = 4 * 60 * MINUTE;
export const MAX_ADVANCE_DAYS = 90;

// Função pura: devolve a mensagem da regra violada, ou null se está tudo certo.
export function validateReservationWindow(
  startAt: Date,
  endAt: Date,
  now: Date,
): string | null {
  const start = startAt.getTime();
  const end = endAt.getTime();

  // Epoch alinhado a 15 min equivale a alinhado em qualquer fuso real (todos são múltiplos de 15).
  if (start % SLOT_MS !== 0 || end % SLOT_MS !== 0) {
    return "Start and end must be multiples of 15 minutes";
  }
  if (end <= start) return "End must be after start";

  const duration = end - start;
  if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
    return "Duration must be between 15 minutes and 4 hours";
  }
  if (start <= now.getTime()) return "Start must be in the future";
  if (start > now.getTime() + MAX_ADVANCE_DAYS * DAY) {
    return `Reservations can be made at most ${MAX_ADVANCE_DAYS} days ahead`;
  }
  return null;
}
