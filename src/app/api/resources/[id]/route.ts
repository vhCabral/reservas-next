import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import {
  resourceIdSchema,
  updateResourceSchema,
} from "@/server/resources/schemas";
import { updateResource } from "@/server/resources/resources.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (request, { params }) => {
  const actor = await requireUser();
  assertAdmin(actor);
  const id = resourceIdSchema.parse((await params).id);
  const input = updateResourceSchema.parse(await readJson(request));
  return NextResponse.json(await updateResource(actor, id, input), {
    headers: { "Cache-Control": "no-store" },
  });
});
