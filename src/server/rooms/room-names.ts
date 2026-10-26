import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { rooms } from "@/server/db/schema";

/**
 * Nomes de salas por id, numa consulta só (evita uma consulta por reserva).
 * Inclui salas inativas de propósito: quem tem reserva numa sala que depois foi
 * desativada continua precisando ver o nome. SÓ chame com ids que saíram das
 * reservas da própria pessoa (ou de um admin): aqui não há checagem de acesso.
 */
export async function getRoomNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(inArray(rooms.id, ids));
  return new Map(rows.map((row) => [row.id, row.name]));
}
