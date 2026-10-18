import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { readJson } from "@/server/http/request";
import { requireUser } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { createResourceSchema } from "@/server/resources/schemas";
import {
  createResource,
  listResourcesFor,
} from "@/server/resources/resources.service";

export const GET = route(async (request: Request) => {
  const actor = await requireUser();
  const includeInactive =
    new URL(request.url).searchParams.get("includeInactive") === "true";
  return NextResponse.json(await listResourcesFor(actor, includeInactive), {
    headers: { "Cache-Control": "no-store" },
  });
});

export const POST = route(async (request: Request) => {
  const actor = await requireUser();
  assertAdmin(actor);
  const input = createResourceSchema.parse(await readJson(request));
  return NextResponse.json(await createResource(actor, input), { status: 201 });
});
