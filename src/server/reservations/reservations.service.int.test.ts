import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/server/db";
import { reservations, rooms, users } from "@/server/db/schema";
import { registerUser } from "@/server/auth/auth.service";
import type { PublicUser } from "@/server/auth/users.repository";
import { createRoom, updateRoom } from "@/server/rooms/rooms.service";
import {
  cancelReservation,
  createReservation,
  getReservationFor,
  listReservationsFor,
} from "./reservations.service";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/server/http/errors";

const DOMAIN = "@reservations-test.invalid";
const password = "uma-senha-longa-1";
let admin: PublicUser;
let ana: PublicUser;
let bob: PublicUser;
let roomId: string;

// Instante futuro alinhado a 15 min, relativo ao relógio real.
function at(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
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
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("criar reserva", () => {
  it("cria CONFIRMED em nome de quem está logado", async () => {
    const r = await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    expect(r.status).toBe("CONFIRMED");
    expect(r.userId).toBe(ana.id);
  });

  it("sobreposição dá ConflictError; reservas coladas e salas diferentes passam", async () => {
    await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });

    await expect(
      createReservation(bob, {
        roomId,
        startAt: at(2, 10, 30),
        endAt: at(2, 11, 30),
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    // Colada: termina 10:00 e começa 11:00 (intervalo [) permite).
    await createReservation(bob, {
      roomId,
      startAt: at(2, 11),
      endAt: at(2, 12),
    });
    await createReservation(bob, {
      roomId,
      startAt: at(2, 9),
      endAt: at(2, 10),
    });

    const other = await createRoom(admin, { name: "test-outra", capacity: 5 });
    await createReservation(bob, {
      roomId: other.id,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
  });

  it("reserva cancelada libera o horário", async () => {
    const r = await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    await cancelReservation(ana, r.id);
    const again = await createReservation(bob, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    expect(again.status).toBe("CONFIRMED");
  });

  it("10 pedidos simultâneos para o mesmo horário: só 1 vence", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        createReservation(i % 2 === 0 ? ana : bob, {
          roomId,
          startAt: at(3, 14),
          endAt: at(3, 15),
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(failures).toHaveLength(9);
    for (const f of failures) expect(f.reason).toBeInstanceOf(ConflictError);
  });

  it("regras de negócio dão 422 e sala inativa ou inexistente dá 404", async () => {
    await expect(
      createReservation(ana, {
        roomId,
        startAt: at(-1, 10),
        endAt: at(-1, 11),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    await expect(
      createReservation(ana, {
        roomId,
        startAt: at(200, 10),
        endAt: at(200, 11),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);

    await updateRoom(admin, roomId, { active: false });
    await expect(
      createReservation(ana, { roomId, startAt: at(2, 10), endAt: at(2, 11) }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ler e cancelar (IDOR)", () => {
  it("reserva alheia é 404 para USER, mas o ADMIN enxerga", async () => {
    const r = await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    await expect(getReservationFor(bob, r.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(cancelReservation(bob, r.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect((await getReservationFor(admin, r.id)).id).toBe(r.id);
    // E o cancelamento tentado por Bob não pode ter surtido efeito.
    expect((await getReservationFor(ana, r.id)).status).toBe("CONFIRMED");
  });

  it("dono cancela; cancelar de novo é idempotente; ADMIN cancela qualquer uma", async () => {
    const r1 = await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    expect((await cancelReservation(ana, r1.id)).status).toBe("CANCELLED");
    expect((await cancelReservation(ana, r1.id)).status).toBe("CANCELLED");

    const r2 = await createReservation(bob, {
      roomId,
      startAt: at(2, 12),
      endAt: at(2, 13),
    });
    expect((await cancelReservation(admin, r2.id)).status).toBe("CANCELLED");
  });

  it("dono não cancela depois do início, mas o ADMIN pode", async () => {
    const start = at(2, 10);
    const r = await createReservation(ana, {
      roomId,
      startAt: start,
      endAt: at(2, 11),
    });
    const afterStart = new Date(start.getTime() + 60_000);

    await expect(
      cancelReservation(ana, r.id, afterStart),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    expect((await cancelReservation(admin, r.id, afterStart)).status).toBe(
      "CANCELLED",
    );
  });
});

describe("listar", () => {
  it("USER vê só as suas; scope=all é só ADMIN", async () => {
    await createReservation(ana, {
      roomId,
      startAt: at(2, 10),
      endAt: at(2, 11),
    });
    await createReservation(bob, {
      roomId,
      startAt: at(2, 12),
      endAt: at(2, 13),
    });

    const mine = await listReservationsFor(ana, { scope: "mine" });
    expect(mine).toHaveLength(1);
    expect(mine[0].userId).toBe(ana.id);

    await expect(
      listReservationsFor(ana, { scope: "all" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(
      (await listReservationsFor(admin, { scope: "all" })).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
