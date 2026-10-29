import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { db } from "@/server/db";
import { resources, roomResources, rooms } from "@/server/db/schema";
import { NotFoundError, UnprocessableEntityError } from "@/server/http/errors";
import { getRoomFor } from "./rooms.service";
import { MAX_RESOURCE_NOTE_LENGTH, MAX_RESOURCE_QUANTITY } from "./schemas";

// O que o serviço recebe de cada recurso da sala. "quantity" omitida vale 1.
export type RoomResourceInput = {
  resourceId: string;
  quantity?: number;
  note?: string | null;
};

export async function listRoomResourcesFor(actor: PublicUser, roomId: string) {
  await getRoomFor(actor, roomId); // 404 se a sala não existe ou está inativa para USER
  return db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      active: resources.active,
      quantity: roomResources.quantity,
      note: roomResources.note,
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

// Confere e normaliza a lista ANTES de tocar no banco. A rota e a tela já
// validam com o schema; isto protege o serviço de quem o chamar direto (e
// evita que o CHECK do banco vire um erro 500).
function normalizeItems(items: RoomResourceInput[]) {
  const seen = new Set<string>();
  return items.map((item) => {
    if (seen.has(item.resourceId)) {
      throw new UnprocessableEntityError("Each resource can appear only once");
    }
    seen.add(item.resourceId);

    const quantity = item.quantity ?? 1;
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_RESOURCE_QUANTITY
    ) {
      throw new UnprocessableEntityError(
        `Quantity must be an integer between 1 and ${MAX_RESOURCE_QUANTITY}`,
      );
    }

    // Observação vazia ou só com espaços vira "sem observação" (null).
    const note = item.note?.trim() || null;
    if (note !== null && note.length > MAX_RESOURCE_NOTE_LENGTH) {
      throw new UnprocessableEntityError(
        `Note must have at most ${MAX_RESOURCE_NOTE_LENGTH} characters`,
      );
    }

    return { resourceId: item.resourceId, quantity, note };
  });
}

// Substitui o conjunto inteiro, tudo ou nada: se algo falha, a transação desfaz.
export async function setRoomResources(
  actor: PublicUser,
  roomId: string,
  items: RoomResourceInput[],
) {
  assertAdmin(actor); // antes de tudo: USER recebe 403 mesmo com lista inválida
  const normalized = normalizeItems(items);
  const ids = normalized.map((i) => i.resourceId);

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
    if (normalized.length > 0) {
      await tx
        .insert(roomResources)
        .values(normalized.map((item) => ({ roomId, ...item })));
    }
  });

  return listRoomResourcesFor(actor, roomId);
}
