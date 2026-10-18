import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { registerUser, authenticate } from "./auth.service";
import { UnauthorizedError } from "@/server/http/errors";

const DOMAIN = "@login-test.invalid";
const email = `ana${DOMAIN}`;
const password = "uma-senha-longa-1";

beforeEach(async () => {
  await registerUser({ name: "Ana", email, password });
});
afterEach(async () => {
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("authenticate", () => {
  it("aceita credenciais corretas e não devolve o hash", async () => {
    const u = await authenticate({ email, password });
    expect(u.email).toBe(email);
    expect(u).not.toHaveProperty("passwordHash");
  });

  it("erro idêntico para senha errada e email inexistente", async () => {
    const wrongPassword = await authenticate({
      email,
      password: "senha-errada-123",
    }).catch((e) => e);
    const unknownEmail = await authenticate({
      email: `x${DOMAIN}`,
      password,
    }).catch((e) => e);

    expect(wrongPassword).toBeInstanceOf(UnauthorizedError);
    expect(unknownEmail).toBeInstanceOf(UnauthorizedError);
    expect(wrongPassword.message).toBe(unknownEmail.message);
  });
});
