import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { roomIdSchema, updateRoomSchema } from "@/server/rooms/schemas";
import { getRoomFor, updateRoom } from "@/server/rooms/rooms.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_request, { params }) => {
  const actor = await requireUser();
  const id = roomIdSchema.parse((await params).id);
  const room = await getRoomFor(actor, id);
  return NextResponse.json(room, { headers: { "Cache-Control": "no-store" } });
});

export const PATCH = route<Ctx>(async (request, { params }) => {
  const actor = await requireUser();
  assertAdmin(actor);
  const id = roomIdSchema.parse((await params).id);
  const input = updateRoomSchema.parse(await readJson(request));
  const room = await updateRoom(actor, id, input);
  return NextResponse.json(room, { headers: { "Cache-Control": "no-store" } });
});
