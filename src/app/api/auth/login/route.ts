import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { loginSchema } from "@/server/auth/schemas";
import { authenticate } from "@/server/auth/auth.service";
import { signAccessToken } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { getClientIp } from "@/server/http/client-ip";
import {
  enforceLoginRateLimit,
  resetLoginPairLimit,
} from "@/server/auth/login-rate-limit";

export const POST = route(async (request: Request) => {
  const input = loginSchema.parse(await readJson(request));
  const ip = getClientIp(request);

  await enforceLoginRateLimit(ip, input.email); // 429 antes de gastar CPU com Argon2
  const user = await authenticate(input);
  await resetLoginPairLimit(ip, input.email);

  const response = NextResponse.json(user);
  setSessionCookie(response, await signAccessToken(user.id));
  response.headers.set("Cache-Control", "no-store");
  return response;
});
