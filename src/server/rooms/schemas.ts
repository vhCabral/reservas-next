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
