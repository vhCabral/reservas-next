import "server-only";
import { ConflictError } from "@/server/http/errors";
import { getDbErrorCode } from "@/server/db/pg-errors";
import { hashPassword } from "./password";
import { insertUser, type PublicUser } from "./users.repository";
import type { RegisterInput } from "./schemas";

const UNIQUE_VIOLATION = "23505";

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    // role não vem do input: o default do banco é USER.
    return await insertUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });
  } catch (error) {
    // Quem decide "email duplicado" é a constraint UNIQUE do banco, não um
    // SELECT antes do INSERT (esse teria race condition).
    if (getDbErrorCode(error) === UNIQUE_VIOLATION) {
      throw new ConflictError("Email already registered");
    }
    throw error;
  }
}
