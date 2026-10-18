import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
};

// Nunca devolve password_hash: o retorno é só o que pode sair da API.
export async function insertUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<PublicUser> {
  const [row] = await db.insert(users).values(data).returning(publicColumns);
  return row;
}

// USO INTERNO (login): inclui password_hash. Nunca serializar isto em resposta.
export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row ?? null;
}
