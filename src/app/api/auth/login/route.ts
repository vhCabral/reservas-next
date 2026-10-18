import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { loginSchema } from "@/server/auth/schemas";
import { authenticate } from "@/server/auth/auth.service";
import { signAccessToken } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";

export const POST = route(async (request: Request) => {
  const user = await authenticate(loginSchema.parse(await readJson(request)));
  const response = NextResponse.json(user);
  setSessionCookie(response, await signAccessToken(user.id));
  response.headers.set("Cache-Control", "no-store");
  return response;
});
