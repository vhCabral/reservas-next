import { ForbiddenError } from "@/server/http/errors";
import type { PublicUser } from "./users.repository";

export function assertAdmin(user: Pick<PublicUser, "role">): void {
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin role required");
}
