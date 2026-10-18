import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { UnauthorizedError } from "@/server/http/errors";
import { ACCESS_TOKEN_TTL_SECONDS, verifyAccessToken } from "./jwt";
import { findUserById, type PublicUser } from "./users.repository";

const isProd = process.env.NODE_ENV === "production";
// O prefixo __Host- obriga Secure + Path=/ + sem Domain: o navegador recusa
// o cookie se alguém tentar afrouxar isso.
export const SESSION_COOKIE = isProd ? "__Host-session" : "session";

const baseOptions = {
  httpOnly: true, // JavaScript da página não lê o cookie (mitiga roubo via XSS)
  secure: isProd,
  sameSite: "lax" as const, // mitiga CSRF em requisições de outro site
  path: "/",
};

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...baseOptions, maxAge: 0 });
}

// O papel (role) vem SEMPRE do banco, a cada requisição, nunca do token.
export async function requireUser(): Promise<PublicUser> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const verified = token ? await verifyAccessToken(token) : null;
  const user = verified ? await findUserById(verified.userId) : null;
  if (!user) throw new UnauthorizedError("Authentication required");
  return user;
}
