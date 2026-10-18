import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { clearSessionCookie } from "@/server/auth/session";

export const POST = route(async () => {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
});
