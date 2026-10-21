import { NextResponse } from "next/server";
import { route } from "@/server/http/error-handler";
import { buildOpenApiDocument } from "@/server/openapi/document";

// Pública de propósito: descreve a forma da API, não contém dado nem segredo.
export const GET = route(async () => {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
});
