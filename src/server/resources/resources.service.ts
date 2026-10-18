import "server-only";
import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { getDbErrorCode, PG_UNIQUE_VIOLATION } from "@/server/db/pg-errors";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import {
  insertResource,
  listResources,
  updateResourceById,
} from "./resources.repository";
import type { CreateResourceInput, UpdateResourceInput } from "./schemas";

const DUPLICATE = "Resource name already exists";

export async function listResourcesFor(
  actor: PublicUser,
  includeInactive: boolean,
) {
  return listResources({
    includeInactive: includeInactive && actor.role === "ADMIN",
  });
}

export async function createResource(
  actor: PublicUser,
  input: CreateResourceInput,
) {
  assertAdmin(actor);
  try {
    return await insertResource(input);
  } catch (error) {
    if (getDbErrorCode(error) === PG_UNIQUE_VIOLATION)
      throw new ConflictError(DUPLICATE);
    throw error;
  }
}

export async function updateResource(
  actor: PublicUser,
  id: string,
  input: UpdateResourceInput,
) {
  assertAdmin(actor);
  try {
    const resource = await updateResourceById(id, input);
    if (!resource) throw new NotFoundError("Resource not found");
    return resource;
  } catch (error) {
    if (getDbErrorCode(error) === PG_UNIQUE_VIOLATION)
      throw new ConflictError(DUPLICATE);
    throw error;
  }
}
