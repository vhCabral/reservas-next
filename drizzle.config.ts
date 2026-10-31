import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { SUPABASE_CA } from "./src/server/db/supabase-ca";

// Por padrão usa o banco de desenvolvimento (.env.local).
// Para outro banco (ex.: produção), aponte o arquivo de forma explícita:
//   $env:ENV_FILE=".env.production.migrate"
const envFile = process.env.ENV_FILE ?? ".env.local";
config({ path: envFile });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error(`DATABASE_URL não definida em ${envFile}`);
}

const url = new URL(rawUrl);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

// Mostra só o host (nunca a senha) para você ver em qual banco está mexendo.
console.log(
  `[drizzle] arquivo: ${envFile} | host: ${url.hostname} | ssl: ${isLocal ? "não (local)" : "sim (certificado verificado)"}`,
);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // Fora da máquina local o SSL é obrigatório e o certificado é verificado.
    // Nunca use rejectUnauthorized: false.
    ssl: isLocal ? false : { ca: SUPABASE_CA, rejectUnauthorized: true },
  },
});
