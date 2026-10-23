import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/config/env";
import { SUPABASE_CA } from "./supabase-ca";

// Em desenvolvimento o Next recarrega os módulos a cada alteração. Sem este cache
// cada recarga abriria um pool novo e esgotaria as conexões do PostgreSQL.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    // Com SSL ligado, o certificado do servidor é sempre verificado.
    // Nunca use rejectUnauthorized: false.
    ssl: env.DATABASE_SSL
      ? { ca: SUPABASE_CA, rejectUnauthorized: true }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool });
