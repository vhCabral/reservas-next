import "server-only";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { NotFoundError } from "@/server/http/errors";
import {
  findRoomById,
  insertRoom,
  listRooms,
  updateRoomById,
} from "./rooms.repository";
import type { CreateRoomInput, UpdateRoomInput } from "./schemas";

const isAdmin = (actor: Pick<PublicUser, "role">) => actor.role === "ADMIN";

export async function listRoomsFor(
  actor: PublicUser,
  includeInactive: boolean,
) {
  // Só ADMIN enxerga salas inativas, mesmo que o USER peça na query.
  return listRooms({ includeInactive: includeInactive && isAdmin(actor) });
}

export async function getRoomFor(actor: PublicUser, id: string) {
  const room = await findRoomById(id);
  // Sala inexistente e sala inativa dão o MESMO 404 para USER: não revela que existe.
  if (!room || (!room.active && !isAdmin(actor)))
    throw new NotFoundError("Room not found");
  return room;
}

export async function createRoom(actor: PublicUser, input: CreateRoomInput) {
  assertAdmin(actor);
  return insertRoom(input);
}

export async function updateRoom(
  actor: PublicUser,
  id: string,
  input: UpdateRoomInput,
) {
  assertAdmin(actor);
  const room = await updateRoomById(id, input);
  if (!room) throw new NotFoundError("Room not found");
  return room;
}
