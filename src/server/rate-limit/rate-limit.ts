import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { rateLimits } from "@/server/db/schema";
import { TooManyRequestsError } from "@/server/http/errors";

// Um único INSERT ... ON CONFLICT: o banco trava a linha, então requisições
// simultâneas não perdem incremento. O relógio é o do banco (now()), não o
// da aplicação.
export async function consume(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start + ${windowSeconds}::int * interval '1 second' <= now()
        THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE
        WHEN rate_limits.window_start + ${windowSeconds}::int * interval '1 second' <= now()
        THEN now() ELSE rate_limits.window_start END
    RETURNING count,
      CEIL(EXTRACT(EPOCH FROM (window_start + ${windowSeconds}::int * interval '1 second' - now())))::int AS retry_after
  `);
  const row = result.rows[0] as { count: number; retry_after: number };
  return {
    allowed: row.count <= limit,
    retryAfterSeconds: Math.max(1, row.retry_after),
  };
}

export async function enforce(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { allowed, retryAfterSeconds } = await consume(
    key,
    limit,
    windowSeconds,
  );
  if (!allowed) throw new TooManyRequestsError(retryAfterSeconds);
}

export async function reset(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
