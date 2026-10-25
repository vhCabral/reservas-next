import { cookies } from "next/headers";
import { env } from "@/server/config/env";
import { signAccessToken } from "@/server/auth/jwt";
import { SESSION_COOKIE } from "@/server/auth/session";

// Mesmas opções do setSessionCookie (usado pelas rotas /api), mas gravando
// pela API cookies(), que é a que funciona dentro de Server Actions.
function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // __Host- exige Secure
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function startSession(userId: string): Promise<void> {
  const token = await signAccessToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...baseOptions(),
    maxAge: env.JWT_EXPIRATION_MINUTES * 60,
  });
}

// Não usamos store.delete(): ele não envia "Secure", e o navegador ignora
// alterações em cookies __Host- sem Secure. Regravamos vazio com maxAge 0.
export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...baseOptions(), maxAge: 0 });
}
