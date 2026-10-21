import { z } from "zod";
import { loginSchema, registerSchema } from "../auth/schemas";
import { createReservationSchema } from "../reservations/schemas";
import {
  createResourceSchema,
  updateResourceSchema,
} from "../resources/schemas";
import {
  createRoomSchema,
  setRoomResourcesSchema,
  updateRoomSchema,
} from "../rooms/schemas";

// ---------------------------------------------------------------------------
// Respostas: descrevem o que a API DEVOLVE (JSON, então datas viram string ISO).
// Nunca existe um campo de senha aqui: o hash não sai da API.
// ---------------------------------------------------------------------------
const isoDateTime = z.iso.datetime({ offset: true });

export const userResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: isoDateTime,
});

export const roomResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  capacity: z.number().int(),
  location: z.string().nullable(),
  active: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const resourceResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// Resumo usado nas listas de recursos DE UMA SALA: sem datas de criação/edição.
export const resourceSummaryResponse = resourceResponse.omit({
  createdAt: true,
  updatedAt: true,
});

export const reservationResponse = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  roomId: z.uuid(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// Só o intervalo ocupado: sem quem reservou (privacidade).
export const busyIntervalResponse = z.object({
  startAt: isoDateTime,
  endAt: isoDateTime,
});

export const errorBodyResponse = z.object({
  timestamp: isoDateTime,
  status: z.number().int(),
  error: z.string(),
  message: z.string(),
  path: z.string(),
  details: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});

// ---------------------------------------------------------------------------
// Conversão Zod -> JSON Schema.
// "input": o que o cliente ENVIA (antes dos transform, ex.: string -> Date).
// "output": o que a API DEVOLVE.
// ---------------------------------------------------------------------------
type JsonSchema = Record<string, unknown>;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

// Limpa ruído que o Zod gera e que só atrapalha a leitura da documentação:
// - "pattern" de uuid/date-time (o "format" já diz tudo);
// - limites de inteiro seguro (±9 quadrilhões);
// - "additionalProperties: false" nas RESPOSTAS (não prometemos isso; nas
//   requisições ele fica, porque a API realmente rejeita campos extras).
function clean(node: unknown, io: "input" | "output"): unknown {
  if (Array.isArray(node)) return node.map((item) => clean(item, io));
  if (node === null || typeof node !== "object") return node;
  const source = node as JsonSchema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = clean(value, io);
  }
  if (result.format === "uuid" || result.format === "date-time") {
    delete result.pattern;
  }
  if (result.minimum === -MAX_SAFE) delete result.minimum;
  if (result.maximum === MAX_SAFE) delete result.maximum;
  if (io === "output" && result.additionalProperties === false) {
    delete result.additionalProperties;
  }
  return result;
}

function toJsonSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
  const json = z.toJSONSchema(schema, { io }) as JsonSchema;
  delete json.$schema; // o OpenAPI 3.1 já define o dialeto
  return clean(json, io) as JsonSchema;
}

const requests = {
  RegisterRequest: registerSchema,
  LoginRequest: loginSchema,
  CreateRoomRequest: createRoomSchema,
  UpdateRoomRequest: updateRoomSchema,
  SetRoomResourcesRequest: setRoomResourcesSchema,
  CreateResourceRequest: createResourceSchema,
  UpdateResourceRequest: updateResourceSchema,
  CreateReservationRequest: createReservationSchema,
};

const responses = {
  User: userResponse,
  Room: roomResponse,
  Resource: resourceResponse,
  ResourceSummary: resourceSummaryResponse,
  Reservation: reservationResponse,
  BusyInterval: busyIntervalResponse,
  ErrorBody: errorBodyResponse,
};

export function buildComponentSchemas(): Record<string, JsonSchema> {
  const schemas: Record<string, JsonSchema> = {};
  for (const [name, schema] of Object.entries(requests)) {
    schemas[name] = toJsonSchema(schema, "input");
  }
  for (const [name, schema] of Object.entries(responses)) {
    schemas[name] = toJsonSchema(schema, "output");
  }
  // O e-mail usa .trim().toLowerCase().pipe(z.email()); no modo "input" o Zod
  // só enxerga o lado string e perde o formato. Devolvemos explicitamente.
  for (const name of ["RegisterRequest", "LoginRequest"]) {
    const properties = schemas[name].properties as Record<string, JsonSchema>;
    properties.email = { ...properties.email, format: "email" };
  }
  return schemas;
}

// Parâmetros de query (?scope=, ?from=&to=) a partir do próprio schema Zod.
export function queryParameters(schema: z.ZodType): JsonSchema[] {
  const json = toJsonSchema(schema, "input");
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required ?? []) as string[]);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: "query",
    required: required.has(name),
    schema: property,
  }));
}
