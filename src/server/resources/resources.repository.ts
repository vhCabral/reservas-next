import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { resources } from "@/server/db/schema";
import type { CreateResourceInput, UpdateResourceInput } from "./schemas";

export type Resource = typeof resources.$inferSelect;

export async function listResources(opts: {
  includeInactive: boolean;
}): Promise<Resource[]> {
  return db
    .select()
    .from(resources)
    .where(opts.includeInactive ? undefined : eq(resources.active, true))
    .orderBy(asc(resources.name));
}

export async function insertResource(
  data: CreateResourceInput,
): Promise<Resource> {
  const [row] = await db.insert(resources).values(data).returning();
  return row;
}

export async function updateResourceById(
  id: string,
  data: UpdateResourceInput,
): Promise<Resource | null> {
  const [row] = await db
    .update(resources)
    .set(data)
    .where(eq(resources.id, id))
    .returning();
  return row ?? null;
}
