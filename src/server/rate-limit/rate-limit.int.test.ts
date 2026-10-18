import { describe, it, expect, afterEach } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/server/db";
import { rateLimits } from "@/server/db/schema";
import { consume } from "./rate-limit";
import { enforceLoginRateLimit } from "@/server/auth/login-rate-limit";
import { TooManyRequestsError } from "@/server/http/errors";

afterEach(async () => {
  await db.delete(rateLimits).where(like(rateLimits.key, "test:%"));
  await db.delete(rateLimits).where(like(rateLimits.key, "login:%"));
});

describe("consume", () => {
  it("permite até o limite e bloqueia depois, com retry-after", async () => {
    for (let i = 0; i < 3; i++)
      expect((await consume("test:a", 3, 60)).allowed).toBe(true);
    const blocked = await consume("test:a", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("requisições simultâneas não furam o limite", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consume("test:race", 5, 60)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it("zera o contador quando a janela passa", async () => {
    await consume("test:win", 1, 1);
    expect((await consume("test:win", 1, 1)).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 1200));
    expect((await consume("test:win", 1, 1)).allowed).toBe(true);
  });
});

describe("enforceLoginRateLimit", () => {
  it("bloqueia a 6ª tentativa do mesmo email e IP com TooManyRequestsError", async () => {
    for (let i = 0; i < 5; i++)
      await enforceLoginRateLimit("203.0.113.7", "a@x.invalid");
    await expect(
      enforceLoginRateLimit("203.0.113.7", "a@x.invalid"),
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("outro email no mesmo IP ainda passa (não tranca a conta alheia)", async () => {
    for (let i = 0; i < 5; i++)
      await enforceLoginRateLimit("203.0.113.8", "a@x.invalid");
    await expect(
      enforceLoginRateLimit("203.0.113.8", "b@x.invalid"),
    ).resolves.toBeUndefined();
  });
});
