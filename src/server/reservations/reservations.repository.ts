import "server-only";
import { and, desc, eq } from "drizzle-orm";
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
