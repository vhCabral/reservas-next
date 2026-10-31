import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { eq, like } from "drizzle-orm";
import { registerUser } from "@/server/auth/auth.service";
import type { PublicUser } from "@/server/auth/users.repository";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { ForbiddenError } from "@/server/http/errors";
import { getUserLabels } from "./user-labels";

const DOMAIN = "@labels-test.invalid";
const password = "uma-senha-longa-1";
let admin: PublicUser;
let ana: PublicUser;

beforeEach(async () => {
  ana = await registerUser({ name: "Ana", email: `ana${DOMAIN}`, password });
  const created = await registerUser({
    name: "Admin",
    email: `admin${DOMAIN}`,
    password,
  });
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, created.id));
  admin = { ...created, role: "ADMIN" };
});

afterEach(async () => {
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("getUserLabels", () => {
  it("ADMIN recebe só nome e e-mail, nunca hash de senha", async () => {
    const labels = await getUserLabels(admin, [ana.id, admin.id]);
    expect(labels.get(ana.id)).toEqual({ name: "Ana", email: `ana${DOMAIN}` });
    expect(labels.size).toBe(2);
    expect(JSON.stringify([...labels.values()])).not.toMatch(/hash|argon/i);
  });

  it("lista vazia devolve mapa vazio", async () => {
    expect((await getUserLabels(admin, [])).size).toBe(0);
  });

  it("id que não existe simplesmente não aparece", async () => {
    const labels = await getUserLabels(admin, [
      ana.id,
      "00000000-0000-4000-8000-000000000000",
    ]);
    expect([...labels.keys()]).toEqual([ana.id]);
  });

  it("USER comum é barrado (403) mesmo pedindo o próprio id", async () => {
    await expect(getUserLabels(ana, [ana.id])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
