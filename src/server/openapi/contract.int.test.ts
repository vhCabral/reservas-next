import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { eq, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { reservations, resources, rooms, users } from "@/server/db/schema";
import { authenticate, registerUser } from "@/server/auth/auth.service";
import type { PublicUser } from "@/server/auth/users.repository";
import { handleError } from "@/server/http/error-handler";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import {
  createResource,
  listResourcesFor,
  updateResource,
} from "@/server/resources/resources.service";
import {
  cancelReservation,
  createReservation,
  getReservationFor,
  getRoomAvailability,
  listReservationsFor,
} from "@/server/reservations/reservations.service";
import {
  listRoomResourcesFor,
  setRoomResources,
} from "@/server/rooms/room-resources.service";
import { createRoomSchema } from "@/server/rooms/schemas";
import {
  createRoom,
  getRoomFor,
  listRoomsFor,
  updateRoom,
} from "@/server/rooms/rooms.service";
import {
  busyIntervalResponse,
  errorBodyResponse,
  reservationResponse,
  resourceResponse,
  resourceSummaryResponse,
  roomResponse,
  userResponse,
} from "./components";

// Teste de CONTRATO: o que a API realmente devolve tem de ser exatamente o que
// a documentação OpenAPI promete. Falhou aqui = ou a API mudou, ou a doc errou.

const DOMAIN = "@contract-test.invalid";
const password = "uma-senha-longa-1";
let admin: PublicUser;
let ana: PublicUser;
let bob: PublicUser;
let roomId: string;

function at(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

// A rota faz NextResponse.json(valor) = JSON.stringify (Date vira texto ISO).
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

// Na documentação campos extras são permitidos; aqui viram ERRO, para que nenhum
// campo (principalmente um passwordHash) escape sem estar documentado.
const strict = (schema: z.ZodObject) => z.strictObject(schema.shape);

function expectMatches(schema: z.ZodObject, value: unknown): void {
  const result = strict(schema).safeParse(wire(value));
  expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(
    true,
  );
}

// Lista vazia passaria sem provar nada, então exigimos pelo menos 1 item.
function expectListMatches(schema: z.ZodObject, value: unknown): void {
  expect(Array.isArray(value)).toBe(true);
  const items = value as unknown[];
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) expectMatches(schema, item);
}

beforeEach(async () => {
  ana = await registerUser({ name: "Ana", email: `ana${DOMAIN}`, password });
  bob = await registerUser({ name: "Bob", email: `bob${DOMAIN}`, password });
  const created = await registerUser({
    name: "Admin",
    email: `admin${DOMAIN}`,
    password,
  });
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, created.id));
  admin = { ...created, role: "ADMIN" };
  roomId = (await createRoom(admin, { name: "test-sala", capacity: 10 })).id;
});

afterEach(async () => {
  // Reservas primeiro: as FKs para usuário e sala são RESTRICT.
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%${DOMAIN}`));
  if (testUsers.length > 0) {
    await db.delete(reservations).where(
      inArray(
        reservations.userId,
        testUsers.map((u) => u.id),
      ),
    );
  }
  await db.delete(rooms).where(like(rooms.name, "test-%"));
  await db.delete(resources).where(like(resources.name, "test-%"));
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("contrato: respostas da API == documentação OpenAPI", () => {
  it("User: cadastro, login e nenhum campo de senha", async () => {
    expectMatches(userResponse, ana);
    const logged = await authenticate({
      email: `ana${DOMAIN}`,
      password,
    });
    expectMatches(userResponse, logged);
  });

  it("Room: criar, ler, atualizar e listar", async () => {
    const created = await createRoom(admin, {
      name: "test-contrato",
      capacity: 8,
      description: "descrição",
      location: "bloco A",
    });
    expectMatches(roomResponse, created);
    expectMatches(roomResponse, await getRoomFor(ana, created.id));
    expectMatches(
      roomResponse,
      await updateRoom(admin, created.id, { capacity: 9 }),
    );
    expectListMatches(roomResponse, await listRoomsFor(ana, false));
  });

  it("Resource e recursos de uma sala", async () => {
    const projector = await createResource(admin, {
      name: "test-projetor",
      description: "4k",
    });
    expectMatches(resourceResponse, projector);
    expectMatches(
      resourceResponse,
      await updateResource(admin, projector.id, { active: true }),
    );
    expectListMatches(resourceResponse, await listResourcesFor(ana, false));

    expectListMatches(
      resourceSummaryResponse,
      await setRoomResources(admin, roomId, [projector.id]),
    );
    expectListMatches(
      resourceSummaryResponse,
      await listRoomResourcesFor(ana, roomId),
    );
  });

  it("Reservation e disponibilidade (BusyInterval)", async () => {
    const reservation = await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    expectMatches(reservationResponse, reservation);
    expectMatches(
      reservationResponse,
      await getReservationFor(ana, reservation.id),
    );
    expectListMatches(
      reservationResponse,
      await listReservationsFor(ana, { scope: "mine" }),
    );
    expectListMatches(
      busyIntervalResponse,
      await getRoomAvailability(bob, roomId, at(2, 0), at(3, 0)),
    );
    expectMatches(
      reservationResponse,
      await cancelReservation(ana, reservation.id),
    );
  });

  it("ErrorBody: formato padronizado dos erros", async () => {
    const notFound = handleError(new NotFoundError("Room not found"), "/api/x");
    expect(notFound.status).toBe(404);
    expectMatches(errorBodyResponse, await notFound.json());

    const conflict = handleError(
      new ConflictError("Room is already reserved for this period"),
      "/api/reservations",
    );
    expect(conflict.status).toBe(409);
    expectMatches(errorBodyResponse, await conflict.json());

    // Erro de validação traz "details" com campo e mensagem.
    const parsed = createRoomSchema.safeParse({ name: "", extra: 1 });
    if (parsed.success) throw new Error("a validação deveria falhar");
    const validation = handleError(parsed.error, "/api/rooms");
    expect(validation.status).toBe(400);
    const body = (await validation.json()) as { details?: unknown[] };
    expectMatches(errorBodyResponse, body);
    expect(body.details?.length).toBeGreaterThan(0);
  });
});
