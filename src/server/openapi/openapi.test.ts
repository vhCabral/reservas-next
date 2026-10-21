import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./document";

const API_DIR = path.resolve(process.cwd(), "src/app/api");
const METHODS = ["get", "post", "put", "patch", "delete"] as const;

// Lê src/app/api/**/route.ts e devolve ["GET /api/rooms/{id}", ...].
function operationsInCode(): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(API_DIR, {
    recursive: true,
    encoding: "utf8",
  })) {
    const file = entry.replace(/\\/g, "/");
    if (!file.endsWith("/route.ts") && file !== "route.ts") continue;
    const urlPath =
      "/api/" +
      file.replace(/\/?route\.ts$/, "").replace(/\[([^\]]+)\]/g, "{$1}");
    const source = readFileSync(path.join(API_DIR, entry), "utf8");
    for (const match of source.matchAll(
      /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\b/g,
    )) {
      found.push(`${match[1]} ${urlPath.replace(/\/$/, "")}`);
    }
  }
  return found.sort();
}

function operationsInSpec(): string[] {
  const paths = buildOpenApiDocument().paths as Record<
    string,
    Record<string, unknown>
  >;
  const found: string[] = [];
  for (const [urlPath, item] of Object.entries(paths)) {
    for (const method of METHODS) {
      if (item[method]) found.push(`${method.toUpperCase()} ${urlPath}`);
    }
  }
  return found.sort();
}

describe("OpenAPI document", () => {
  it("is a valid OpenAPI 3.1 document", async () => {
    const result = await new Validator().validate(buildOpenApiDocument());
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(true);
  });

  it("documents exactly the routes that exist in src/app/api", () => {
    // Falha se uma rota foi criada/removida sem atualizar a documentação.
    expect(operationsInSpec()).toEqual(operationsInCode());
  });

  it("never exposes password fields in responses", () => {
    const schemas = (
      buildOpenApiDocument().components as {
        schemas: Record<string, { properties?: Record<string, unknown> }>;
      }
    ).schemas;
    for (const name of ["User", "Room", "Resource", "Reservation"]) {
      expect(Object.keys(schemas[name].properties ?? {})).not.toContain(
        "passwordHash",
      );
    }
  });

  it("rejects unknown fields in write requests (mass assignment)", () => {
    const schemas = (
      buildOpenApiDocument().components as {
        schemas: Record<string, { additionalProperties?: boolean }>;
      }
    ).schemas;
    for (const name of [
      "RegisterRequest",
      "LoginRequest",
      "CreateRoomRequest",
      "UpdateRoomRequest",
      "CreateReservationRequest",
    ]) {
      expect(schemas[name].additionalProperties, name).toBe(false);
    }
  });

  it("keeps the document readable (no huge regex patterns)", () => {
    const text = JSON.stringify(buildOpenApiDocument());
    expect(text).not.toContain("00000000-0000-0000-0000-000000000000");
    expect(text.length).toBeLessThan(30_000);
  });

  it("documents the e-mail format on login and register", () => {
    const schemas = (
      buildOpenApiDocument().components as {
        schemas: Record<string, { properties: { email: { format?: string } } }>;
      }
    ).schemas;
    expect(schemas.RegisterRequest.properties.email.format).toBe("email");
    expect(schemas.LoginRequest.properties.email.format).toBe("email");
  });
});
