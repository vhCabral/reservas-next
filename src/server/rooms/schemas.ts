import { z } from "zod";

const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(500).nullable();
const capacity = z.number().int().min(1).max(10_000);
const location = z.string().trim().max(120).nullable();

export const roomIdSchema = z.uuid();

// strictObject: campos desconhecidos (ex.: "active", "id") são rejeitados.
export const createRoomSchema = z.strictObject({
  name,
  capacity,
  description: description.optional(),
  location: location.optional(),
});

export const updateRoomSchema = z
  .strictObject({
    name: name.optional(),
    capacity: capacity.optional(),
    description: description.optional(),
    location: location.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// Limites dos recursos de uma sala. O banco repete o da quantidade (CHECK).
export const MAX_RESOURCE_QUANTITY = 99;
export const MAX_RESOURCE_NOTE_LENGTH = 200;
export const MAX_ROOM_RESOURCES = 50;

// Um recurso dentro de uma sala: quantas unidades e uma observação opcional
// (ex.: o modelo do aparelho). Sem "quantity", vale 1.
export const roomResourceItemSchema = z.strictObject({
  resourceId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_RESOURCE_QUANTITY).default(1),
  note: z.string().trim().max(MAX_RESOURCE_NOTE_LENGTH).nullable().optional(),
});

// Substitui o conjunto inteiro. Cada recurso aparece no máximo uma vez.
export const setRoomResourcesSchema = z
  .strictObject({
    items: z.array(roomResourceItemSchema).max(MAX_ROOM_RESOURCES),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.resourceId)).size === v.items.length,
    { message: "Each resource can appear only once", path: ["items"] },
  );

export type RoomResourceItemInput = z.input<typeof roomResourceItemSchema>;
