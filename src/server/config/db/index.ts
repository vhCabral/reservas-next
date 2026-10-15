import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/config/env";

// Em desenvolvimento o Next recarrega os módulos a cada alteração. Sem este cache
// cada recarga abriria um pool novo e esgotaria as conexões do PostgreSQL.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool });
