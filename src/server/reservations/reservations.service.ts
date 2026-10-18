import "server-only";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { getDbErrorCode, PG_EXCLUSION_VIOLATION } from "@/server/db/pg-errors";
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/server/http/errors";
import { findRoomById } from "@/server/rooms/rooms.repository";
import { validateReservationWindow } from "./reservation-policy";
import {
  cancelConfirmedById,
  findReservationById,
  insertReservation,
  listReservations,
  type Reservation,
} from "./reservations.repository";
import type { CreateReservationInput } from "./schemas";

// `now` é parâmetro para os testes controlarem o relógio.
export async function createReservation(
  actor: PublicUser,
  input: CreateReservationInput,
  now: Date = new Date(),
): Promise<Reservation> {
  const problem = validateReservationWindow(input.startAt, input.endAt, now);
  if (problem) throw new UnprocessableEntityError(problem);

  const room = await findRoomById(input.roomId);
  if (!room || !room.active) throw new NotFoundError("Room not found");

  try {
    // userId vem da sessão, nunca do corpo da requisição.
    return await insertReservation({
      userId: actor.id,
      roomId: input.roomId,
      startAt: input.startAt,
      endAt: input.endAt,
    });
  } catch (error) {
    // Quem decide o conflito é a constraint EXCLUDE do banco, não um SELECT antes.
    if (getDbErrorCode(error) === PG_EXCLUSION_VIOLATION) {
      throw new ConflictError("Room is already reserved for this period");
    }
    throw error;
  }
}

export async function getReservationFor(
  actor: PublicUser,
  id: string,
): Promise<Reservation> {
  const reservation = await findReservationById(id);
  // Reserva alheia e reserva inexistente dão o MESMO 404 (anti-IDOR).
  if (
    !reservation ||
    (reservation.userId !== actor.id && actor.role !== "ADMIN")
  ) {
    throw new NotFoundError("Reservation not found");
  }
  return reservation;
}

export async function listReservationsFor(
  actor: PublicUser,
  opts: { scope: "mine" | "all" },
) {
  if (opts.scope === "all") assertAdmin(actor);
  return listReservations(opts.scope === "all" ? {} : { userId: actor.id });
}

export async function cancelReservation(
  actor: PublicUser,
  id: string,
  now: Date = new Date(),
): Promise<Reservation> {
  const reservation = await getReservationFor(actor, id);

  if (reservation.status === "CANCELLED") return reservation; // idempotente

  if (
    actor.role !== "ADMIN" &&
    reservation.startAt.getTime() <= now.getTime()
  ) {
    throw new UnprocessableEntityError("Reservation has already started");
  }

  const cancelled = await cancelConfirmedById(id);
  if (cancelled) return cancelled;
  // Outra requisição cancelou no meio: devolve o estado atual.
  return getReservationFor(actor, id);
}
