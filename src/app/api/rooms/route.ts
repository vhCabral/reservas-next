import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { createRoomSchema } from "@/server/rooms/schemas";
import { createRoom, listRoomsFor } from "@/server/rooms/rooms.service";

export const GET = route(async (request: Request) => {
  const actor = await requireUser();
  const includeInactive =
    new URL(request.url).searchParams.get("includeInactive") === "true";
  const rooms = await listRoomsFor(actor, includeInactive);
  return NextResponse.json(rooms, { headers: { "Cache-Control": "no-store" } });
});

export const POST = route(async (request: Request) => {
  const actor = await requireUser();
  assertAdmin(actor); // falha rápido: USER recebe 403, não 400
  const input = createRoomSchema.parse(await readJson(request));
  const room = await createRoom(actor, input);
  return NextResponse.json(room, { status: 201 });
});
