import { describe, it, expect, afterEach } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { registerUser } from "./auth.service";
import { findUserByEmail } from "./users.repository";
import { ConflictError } from "@/server/http/errors";

const DOMAIN = "@svc-test.invalid";
const base = { name: "Ana", password: "uma-senha-longa-1" };

afterEach(async () => {
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("registerUser", () => {
  it("cria usuário USER e guarda só o hash Argon2id", async () => {
    const u = await registerUser({ ...base, email: `ana${DOMAIN}` });
    expect(u.role).toBe("USER");
    expect(u).not.toHaveProperty("passwordHash");

    const row = await findUserByEmail(`ana${DOMAIN}`);
    expect(row?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(row?.passwordHash).not.toContain(base.password);
  });

  it("rejeita email duplicado com ConflictError", async () => {
    await registerUser({ ...base, email: `dup${DOMAIN}` });
    await expect(
      registerUser({ ...base, email: `dup${DOMAIN}` }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("cadastros simultâneos do mesmo email: só um vence", async () => {
    const results = await Promise.allSettled([
      registerUser({ ...base, email: `race${DOMAIN}` }),
      registerUser({ ...base, email: `race${DOMAIN}` }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(ConflictError);
  });
});
