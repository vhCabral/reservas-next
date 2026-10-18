import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { rooms } from "@/server/db/schema";
import type { CreateRoomInput, UpdateRoomInput } from "./schemas";

export type Room = typeof rooms.$inferSelect;

export async function listRooms(opts: {
  includeInactive: boolean;
}): Promise<Room[]> {
  return db
    .select()
    .from(rooms)
    .where(opts.includeInactive ? undefined : eq(rooms.active, true))
    .orderBy(asc(rooms.name));
}

export async function findRoomById(id: string): Promise<Room | null> {
  const [row] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return row ?? null;
}

export async function insertRoom(data: CreateRoomInput): Promise<Room> {
  const [row] = await db.insert(rooms).values(data).returning();
  return row;
}

export async function updateRoomById(
  id: string,
  data: UpdateRoomInput,
): Promise<Room | null> {
  const [row] = await db
    .update(rooms)
    .set(data)
    .where(eq(rooms.id, id))
    .returning();
  return row ?? null;
}
