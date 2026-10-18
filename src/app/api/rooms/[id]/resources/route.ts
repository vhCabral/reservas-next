import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { roomIdSchema, setRoomResourcesSchema } from "@/server/rooms/schemas";
import {
  listRoomResourcesFor,
  setRoomResources,
} from "@/server/rooms/room-resources.service";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { headers: { "Cache-Control": "no-store" } };

export const GET = route<Ctx>(async (_request, { params }) => {
  const actor = await requireUser();
  const roomId = roomIdSchema.parse((await params).id);
  return NextResponse.json(await listRoomResourcesFor(actor, roomId), noStore);
});

export const PUT = route<Ctx>(async (request, { params }) => {
  const actor = await requireUser();
  assertAdmin(actor);
  const roomId = roomIdSchema.parse((await params).id);
  const { resourceIds } = setRoomResourcesSchema.parse(await readJson(request));
  return NextResponse.json(
    await setRoomResources(actor, roomId, resourceIds),
    noStore,
  );
});
