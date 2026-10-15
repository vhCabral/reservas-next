import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres"),
  JWT_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(15),
});

// Se faltar algo ou estiver inválido, lança erro na hora, e não em produção.
export const env = schema.parse(process.env);
