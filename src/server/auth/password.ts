import "server-only";
import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// Mínimo recomendado pela OWASP para Argon2id: 19 MiB, 2 iterações, paralelismo 1.
// Fixados aqui de propósito, para não depender dos valores padrão da biblioteca.
const ARGON2_OPTIONS = {
  memoryCost: 19456, // em KiB
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    // Hash malformado ou corrompido: conta como falha, nunca estoura para o chamador.
    return false;
  }
}

// Usado quando o e-mail não existe: gasta o mesmo tempo de uma verificação real,
// para o tempo de resposta não revelar se a conta existe.
let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummyHash(plain: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  await verifyPassword(await dummyHash, plain);
}
