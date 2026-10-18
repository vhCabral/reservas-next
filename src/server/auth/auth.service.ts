import { UnauthorizedError } from "@/server/http/errors";
import { verifyPassword, verifyAgainstDummyHash } from "./password";
import { findUserByEmail } from "./users.repository";
import type { LoginInput } from "./schemas";
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

const INVALID_CREDENTIALS = "Invalid email or password";

export async function authenticate(input: LoginInput): Promise<PublicUser> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    // Gasta o mesmo tempo de um hash real: sem isso, a resposta mais rápida
    // revelaria que o email não existe.
    await verifyAgainstDummyHash(input.password);
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  // Mensagem idêntica nos dois casos, e o hash nunca sai daqui.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
