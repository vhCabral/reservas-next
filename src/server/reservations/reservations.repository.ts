import "server-only";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { reservations } from "@/server/db/schema";

export type Reservation = typeof reservations.$inferSelect;

export async function insertReservation(data: {
  userId: string;
  roomId: string;
  startAt: Date;
  endAt: Date;
}): Promise<Reservation> {
  const [row] = await db.insert(reservations).values(data).returning();
  return row;
}

export async function findReservationById(
  id: string,
): Promise<Reservation | null> {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);
  return row ?? null;
}

export async function listReservations(opts: {
  userId?: string;
}): Promise<Reservation[]> {
  return db
    .select()
    .from(reservations)
    .where(opts.userId ? eq(reservations.userId, opts.userId) : undefined)
    .orderBy(desc(reservations.startAt))
    .limit(100);
}

// Só cancela se ainda estiver CONFIRMED; devolve null se outra requisição chegou antes.
export async function cancelConfirmedById(
  id: string,
): Promise<Reservation | null> {
  const [row] = await db
    .update(reservations)
    .set({ status: "CANCELLED" })
    .where(and(eq(reservations.id, id), eq(reservations.status, "CONFIRMED")))
    .returning();
  return row ?? null;
}

// Só intervalos CONFIRMED que tocam a janela. Semiaberto: quem apenas encosta não conta.
export async function listBusyIntervals(roomId: string, from: Date, to: Date) {
  return db
    .select({ startAt: reservations.startAt, endAt: reservations.endAt })
    .from(reservations)
    .where(
      and(
        eq(reservations.roomId, roomId),
        eq(reservations.status, "CONFIRMED"),
        lt(reservations.startAt, to),
        gt(reservations.endAt, from),
      ),
    )
    .orderBy(asc(reservations.startAt));
}
