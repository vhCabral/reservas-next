import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { registerSchema } from "@/server/auth/schemas";
import { registerUser } from "@/server/auth/auth.service";

export const POST = route(async (request: Request) => {
  const input = registerSchema.parse(await readJson(request));
  const user = await registerUser(input);
  return NextResponse.json(user, { status: 201 });
});
