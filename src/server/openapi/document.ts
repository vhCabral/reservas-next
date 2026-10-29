import {
  availabilityQuerySchema,
  listReservationsQuerySchema,
} from "../reservations/schemas";
import { buildComponentSchemas, queryParameters } from "./components";

type Json = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name: string) => ({ type: "array", items: ref(name) });

const jsonContent = (schema: Json) => ({
  "application/json": { schema },
});

const body = (name: string) => ({
  required: true,
  content: jsonContent(ref(name)),
});

const idParam: Json = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const includeInactiveParam: Json = {
  name: "includeInactive",
  in: "query",
  required: false,
  description: "Only ADMIN sees inactive items; ignored for other users.",
  schema: { type: "boolean", default: false },
};

// Erros padronizados: todos usam o mesmo corpo (ErrorBody).
const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: "Validation failed (invalid format, unknown field or malformed id)",
  401: "Not authenticated",
  403: "Authenticated but not allowed (requires ADMIN)",
  404: "Not found (also returned for resources owned by someone else)",
  409: "Conflict with the current state (duplicate or already reserved)",
  422: "Business rule violated",
  429: "Too many attempts",
};

function errors(...codes: number[]): Record<string, Json> {
  return Object.fromEntries(
    codes.map((code) => [
      String(code),
      {
        description: ERROR_DESCRIPTIONS[code],
        content: jsonContent(ref("ErrorBody")),
      },
    ]),
  );
}

const authenticated = [{ cookieAuth: [] }];
const noAuth: Json[] = [];

export function buildOpenApiDocument(): Json {
  return {
    openapi: "3.1.0",
    info: {
      title: "Room Booking API",
      version: "1.0.0",
      description:
        "API for booking rooms and auditoriums. Double booking is prevented by " +
        "the database (EXCLUDE constraint), so concurrent requests for the same " +
        "period produce exactly one 201 and the rest 409. Timestamps must carry an " +
        "explicit timezone (e.g. 2026-12-01T10:00:00-03:00) and be multiples of 15 minutes.",
    },
    tags: [
      { name: "Auth" },
      { name: "Rooms" },
      { name: "Resources" },
      { name: "Reservations" },
      { name: "Docs" },
    ],
    paths: {
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create an account (role is always USER)",
          operationId: "register",
          security: noAuth,
          requestBody: body("RegisterRequest"),
          responses: {
            "201": {
              description: "Account created",
              content: jsonContent(ref("User")),
            },
            ...errors(400, 409),
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in and receive the session cookie",
          description:
            "Rate limited per IP and per email+IP. Wrong email and wrong password " +
            "return the same 401 on purpose.",
          operationId: "login",
          security: noAuth,
          requestBody: body("LoginRequest"),
          responses: {
            "200": {
              description: "Logged in. The session is an httpOnly cookie.",
              headers: {
                "Set-Cookie": {
                  description: "Session cookie (httpOnly, SameSite=Lax)",
                  schema: { type: "string" },
                },
              },
              content: jsonContent(ref("User")),
            },
            ...errors(400, 401, 429),
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Clear the session cookie",
          operationId: "logout",
          security: noAuth,
          responses: { "204": { description: "Logged out" } },
        },
      },
      "/api/users/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user",
          operationId: "getCurrentUser",
          security: authenticated,
          responses: {
            "200": {
              description: "Current user",
              content: jsonContent(ref("User")),
            },
            ...errors(401),
          },
        },
      },
      "/api/rooms": {
        get: {
          tags: ["Rooms"],
          summary: "List rooms",
          operationId: "listRooms",
          security: authenticated,
          parameters: [includeInactiveParam],
          responses: {
            "200": {
              description: "Rooms",
              content: jsonContent(arrayOf("Room")),
            },
            ...errors(401),
          },
        },
        post: {
          tags: ["Rooms"],
          summary: "Create a room (ADMIN)",
          operationId: "createRoom",
          security: authenticated,
          requestBody: body("CreateRoomRequest"),
          responses: {
            "201": {
              description: "Room created",
              content: jsonContent(ref("Room")),
            },
            ...errors(400, 401, 403),
          },
        },
      },
      "/api/rooms/{id}": {
        get: {
          tags: ["Rooms"],
          summary: "Get a room (inactive rooms are hidden from non-admins)",
          operationId: "getRoom",
          security: authenticated,
          parameters: [idParam],
          responses: {
            "200": { description: "Room", content: jsonContent(ref("Room")) },
            ...errors(400, 401, 404),
          },
        },
        patch: {
          tags: ["Rooms"],
          summary: "Update a room (ADMIN)",
          operationId: "updateRoom",
          security: authenticated,
          parameters: [idParam],
          requestBody: body("UpdateRoomRequest"),
          responses: {
            "200": {
              description: "Updated room",
              content: jsonContent(ref("Room")),
            },
            ...errors(400, 401, 403, 404),
          },
        },
      },
      "/api/rooms/{id}/availability": {
        get: {
          tags: ["Rooms"],
          summary: "Busy intervals of a room (no user data)",
          description:
            "`from` and `to` are ISO timestamps with timezone. The range is at most 31 days.",
          operationId: "getRoomAvailability",
          security: authenticated,
          parameters: [idParam, ...queryParameters(availabilityQuerySchema)],
          responses: {
            "200": {
              description: "Confirmed busy intervals in the range",
              content: jsonContent(arrayOf("BusyInterval")),
            },
            ...errors(400, 401, 404),
          },
        },
      },
      "/api/rooms/{id}/resources": {
        get: {
          tags: ["Rooms"],
          summary: "Resources available in a room",
          operationId: "listRoomResources",
          security: authenticated,
          parameters: [idParam],
          responses: {
            "200": {
              description: "Resources",
              content: jsonContent(arrayOf("RoomResource")),
            },
            ...errors(400, 401, 404),
          },
        },
        put: {
          tags: ["Rooms"],
          summary: "Replace the resources of a room (ADMIN)",
          operationId: "setRoomResources",
          security: authenticated,
          parameters: [idParam],
          requestBody: body("SetRoomResourcesRequest"),
          responses: {
            "200": {
              description: "New set of resources",
              content: jsonContent(arrayOf("RoomResource")),
            },
            ...errors(400, 401, 403, 404, 409),
          },
        },
      },
      "/api/resources": {
        get: {
          tags: ["Resources"],
          summary: "List resources",
          operationId: "listResources",
          security: authenticated,
          parameters: [includeInactiveParam],
          responses: {
            "200": {
              description: "Resources",
              content: jsonContent(arrayOf("Resource")),
            },
            ...errors(401),
          },
        },
        post: {
          tags: ["Resources"],
          summary: "Create a resource (ADMIN)",
          operationId: "createResource",
          security: authenticated,
          requestBody: body("CreateResourceRequest"),
          responses: {
            "201": {
              description: "Resource created",
              content: jsonContent(ref("Resource")),
            },
            ...errors(400, 401, 403, 409),
          },
        },
      },
      "/api/resources/{id}": {
        patch: {
          tags: ["Resources"],
          summary: "Update a resource (ADMIN)",
          operationId: "updateResource",
          security: authenticated,
          parameters: [idParam],
          requestBody: body("UpdateResourceRequest"),
          responses: {
            "200": {
              description: "Updated resource",
              content: jsonContent(ref("Resource")),
            },
            ...errors(400, 401, 403, 404, 409),
          },
        },
      },
      "/api/reservations": {
        get: {
          tags: ["Reservations"],
          summary:
            "List reservations (own by default; scope=all is ADMIN only)",
          operationId: "listReservations",
          security: authenticated,
          parameters: queryParameters(listReservationsQuerySchema),
          responses: {
            "200": {
              description: "Reservations",
              content: jsonContent(arrayOf("Reservation")),
            },
            ...errors(400, 401, 403),
          },
        },
        post: {
          tags: ["Reservations"],
          summary: "Create a reservation for the current user",
          description:
            "The owner always comes from the session, never from the body. " +
            "Rules: 15 min to 4 h, start in the future, at most 90 days ahead, " +
            "start and end on 15-minute marks.",
          operationId: "createReservation",
          security: authenticated,
          requestBody: body("CreateReservationRequest"),
          responses: {
            "201": {
              description: "Reservation confirmed",
              content: jsonContent(ref("Reservation")),
            },
            ...errors(400, 401, 404, 409, 422),
          },
        },
      },
      "/api/reservations/{id}": {
        get: {
          tags: ["Reservations"],
          summary: "Get a reservation (others' reservations return 404)",
          operationId: "getReservation",
          security: authenticated,
          parameters: [idParam],
          responses: {
            "200": {
              description: "Reservation",
              content: jsonContent(ref("Reservation")),
            },
            ...errors(400, 401, 404),
          },
        },
      },
      "/api/reservations/{id}/cancel": {
        post: {
          tags: ["Reservations"],
          summary: "Cancel a reservation (idempotent)",
          description:
            "The owner can cancel until the start time. ADMIN can cancel any reservation at any time.",
          operationId: "cancelReservation",
          security: authenticated,
          parameters: [idParam],
          responses: {
            "200": {
              description: "Cancelled reservation",
              content: jsonContent(ref("Reservation")),
            },
            ...errors(400, 401, 404, 422),
          },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Docs"],
          summary: "This document",
          operationId: "getOpenApiDocument",
          security: noAuth,
          responses: {
            "200": {
              description: "OpenAPI 3.1 document",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          // Nome usado em produção (prefixo __Host- exige HTTPS). Em dev o nome pode diferir.
          name: "__Host-session",
          description:
            "JWT in an httpOnly cookie, set by POST /api/auth/login.",
        },
      },
      schemas: buildComponentSchemas(),
    },
  };
}
