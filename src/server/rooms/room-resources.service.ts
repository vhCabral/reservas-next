import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { db } from "@/server/db";
import { resources, roomResources, rooms } from "@/server/db/schema";
import { NotFoundError, UnprocessableEntityError } from "@/server/http/errors";
import { getRoomFor } from "./rooms.service";

export async function listRoomResourcesFor(actor: PublicUser, roomId: string) {
  await getRoomFor(actor, roomId); // 404 se a sala não existe ou está inativa para USER
  return db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      active: resources.active,
    })
    .from(roomResources)
    .innerJoin(resources, eq(roomResources.resourceId, resources.id))
    .where(
      and(
        eq(roomResources.roomId, roomId),
        actor.role === "ADMIN" ? undefined : eq(resources.active, true),
      ),
    )
    .orderBy(asc(resources.name));
}

// Substitui o conjunto inteiro, tudo ou nada: se algo falha, a transação desfaz.
export async function setRoomResources(
  actor: PublicUser,
  roomId: string,
  resourceIds: string[],
) {
  assertAdmin(actor);
  const ids = [...new Set(resourceIds)];

  await db.transaction(async (tx) => {
    const [room] = await tx
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    if (!room) throw new NotFoundError("Room not found");

    if (ids.length > 0) {
      const found = await tx
        .select({ id: resources.id })
        .from(resources)
        .where(and(inArray(resources.id, ids), eq(resources.active, true)));
      if (found.length !== ids.length) {
        throw new UnprocessableEntityError(
          "One or more resources do not exist or are inactive",
        );
      }
    }

    await tx.delete(roomResources).where(eq(roomResources.roomId, roomId));
    if (ids.length > 0) {
      await tx
        .insert(roomResources)
        .values(ids.map((resourceId) => ({ roomId, resourceId })));
    }
  });

  return listRoomResourcesFor(actor, roomId);
}
