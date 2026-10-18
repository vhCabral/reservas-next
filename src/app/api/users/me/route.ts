import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { requireUser } from "@/server/auth/session";

export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
});
