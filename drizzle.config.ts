import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Por padrão usa o banco de desenvolvimento (.env.local).
// Para outro banco (ex.: produção), aponte o arquivo de forma explícita:
//   $env:ENV_FILE=".env.production.migrate"
const envFile = process.env.ENV_FILE ?? ".env.local";
config({ path: envFile });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(`DATABASE_URL não definida em ${envFile}`);
}

// Mostra só o host (nunca a senha) para você ver em qual banco está mexendo.
console.log(
  `[drizzle] arquivo: ${envFile} | host: ${url.match(/@([^/?]+)/)?.[1]}`,
);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
