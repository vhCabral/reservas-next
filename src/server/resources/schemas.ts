import { z } from "zod";

const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(500).nullable();

export const resourceIdSchema = z.uuid();

export const createResourceSchema = z.strictObject({
  name,
  description: description.optional(),
});

export const updateResourceSchema = z
  .strictObject({
    name: name.optional(),
    description: description.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
