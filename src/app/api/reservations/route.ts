import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import {
  createReservationSchema,
  listReservationsQuerySchema,
} from "@/server/reservations/schemas";
import {
  createReservation,
  listReservationsFor,
} from "@/server/reservations/reservations.service";

export const POST = route(async (request: Request) => {
  const actor = await requireUser();
  const input = createReservationSchema.parse(await readJson(request));
  const reservation = await createReservation(actor, input);
  return NextResponse.json(reservation, { status: 201 });
});

export const GET = route(async (request: Request) => {
  const actor = await requireUser();
  const url = new URL(request.url);
  const { scope } = listReservationsQuerySchema.parse({
    scope: url.searchParams.get("scope") ?? undefined,
  });
  return NextResponse.json(await listReservationsFor(actor, { scope }), {
    headers: { "Cache-Control": "no-store" },
  });
});
