import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { requireUser } from "@/server/auth/session";
import { reservationIdSchema } from "@/server/reservations/schemas";
import { cancelReservation } from "@/server/reservations/reservations.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_request, { params }) => {
  const actor = await requireUser();
  const id = reservationIdSchema.parse((await params).id);
  return NextResponse.json(await cancelReservation(actor, id), {
    headers: { "Cache-Control": "no-store" },
  });
});
