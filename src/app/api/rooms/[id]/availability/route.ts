import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { requireUser } from "@/server/auth/session";
import { roomIdSchema } from "@/server/rooms/schemas";
import { availabilityQuerySchema } from "@/server/reservations/schemas";
import { getRoomAvailability } from "@/server/reservations/reservations.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (request, { params }) => {
  const actor = await requireUser();
  const roomId = roomIdSchema.parse((await params).id);
  const url = new URL(request.url);
  const { from, to } = availabilityQuerySchema.parse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  return NextResponse.json(await getRoomAvailability(actor, roomId, from, to), {
    headers: { "Cache-Control": "no-store" },
  });
});
