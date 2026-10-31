import "server-only";
import { inArray } from "drizzle-orm";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export type UserLabel = { name: string; email: string };

/**
 * Nome e e-mail de vários usuários, para a administração identificar quem
 * fez cada reserva. Só ADMIN: nome e e-mail são dado pessoal, e a checagem fica
 * AQUI (e não só na página) para que nenhuma tela futura vaze isso sem querer.
 * Seleciona apenas essas duas colunas: nunca o hash da senha.
 */
export async function getUserLabels(
  actor: PublicUser,
  ids: string[],
): Promise<Map<string, UserLabel>> {
  assertAdmin(actor);
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
}
