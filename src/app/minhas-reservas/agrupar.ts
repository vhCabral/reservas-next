// Funções puras para a tela "Minhas reservas": fáceis de testar, sem banco.
export type ReservationLike = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: "CONFIRMED" | "CANCELLED";
};

/** Próximas = confirmadas que ainda não terminaram. O resto vai para o histórico. */
export function splitReservations<T extends ReservationLike>(
  list: T[],
  now: Date,
): { upcoming: T[]; history: T[] } {
  const upcoming: T[] = [];
  const history: T[] = [];
  for (const item of list) {
    if (item.status === "CONFIRMED" && item.endAt.getTime() > now.getTime()) {
      upcoming.push(item);
    } else {
      history.push(item);
    }
  }
  upcoming.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  history.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return { upcoming, history };
}

/**
 * Só decide se o botão aparece. A regra de verdade (dono ou admin, ainda não
 * começou) continua no serviço: esconder o botão não protege nada.
 */
export function canCancel(item: ReservationLike, now: Date): boolean {
  return item.status === "CONFIRMED" && item.startAt.getTime() > now.getTime();
}

export type StatusInfo = { label: string; tone: "ok" | "info" | "muted" };

export function statusInfo(item: ReservationLike, now: Date): StatusInfo {
  if (item.status === "CANCELLED") return { label: "Cancelada", tone: "muted" };
  if (item.endAt.getTime() <= now.getTime()) {
    return { label: "Concluída", tone: "muted" };
  }
  if (item.startAt.getTime() <= now.getTime()) {
    return { label: "Em andamento", tone: "info" };
  }
  return { label: "Confirmada", tone: "ok" };
}
