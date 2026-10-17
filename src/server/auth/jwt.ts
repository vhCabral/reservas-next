import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { env } from "@/server/config/env";

const ALGORITHM = "HS256";
const ISSUER = "reservas-api";
const AUDIENCE = "reservas-web";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const userIdSchema = z.uuid();

export const ACCESS_TOKEN_TTL_SECONDS = env.JWT_EXPIRATION_MINUTES * 60;

// O token carrega apenas o ID do usuário. Papel, e-mail e qualquer outro dado
// são lidos do banco a cada requisição, para mudanças valerem imediatamente.
export function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      // Fixar o algoritmo impede ataques de troca ("none", HS512, etc.).
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ["sub", "exp", "iat"],
    });
    const userId = userIdSchema.safeParse(payload.sub);
    return userId.success ? { userId: userId.data } : null;
  } catch {
    // Assinatura inválida, expirado, malformado... tudo vira "não autenticado".
    return null;
  }
}
