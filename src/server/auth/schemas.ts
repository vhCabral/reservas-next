import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

// strictObject: campos extras (ex.: "role") são REJEITADOS, não ignorados.
// Isso fecha a porta para mass assignment (alguém mandar role: "ADMIN").
export const registerSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  email,
  // Senha NÃO recebe trim: espaços fazem parte dela.
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

// No login não validamos o mínimo de 10: a resposta de erro tem que ser
// idêntica para "senha errada" e "senha curta", senão vaza informação.
export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
