import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/server/db";
import { rooms, users } from "@/server/db/schema";
import { registerUser } from "@/server/auth/auth.service";
import type { PublicUser } from "@/server/auth/users.repository";
import {
  createRoom,
  getRoomFor,
  listRoomsFor,
  updateRoom,
} from "./rooms.service";
import { ForbiddenError, NotFoundError } from "@/server/http/errors";

const DOMAIN = "@rooms-test.invalid";
const password = "uma-senha-longa-1";
let admin: PublicUser;
let user: PublicUser;

beforeEach(async () => {
  user = await registerUser({ name: "User", email: `user${DOMAIN}`, password });
  const created = await registerUser({
    name: "Admin",
    email: `admin${DOMAIN}`,
    password,
  });
  // ADMIN só existe por promoção direta no banco, como definido no projeto.
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, created.id));
  admin = { ...created, role: "ADMIN" };
});

afterEach(async () => {
  await db.delete(rooms).where(like(rooms.name, "test-%"));
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

describe("rooms service", () => {
  it("USER não cria sala e nada é gravado", async () => {
    await expect(
      createRoom(user, { name: "test-x", capacity: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const all = await listRoomsFor(admin, true);
    expect(all.some((r) => r.name === "test-x")).toBe(false);
  });

  it("ADMIN cria e USER enxerga a sala ativa", async () => {
    const room = await createRoom(admin, { name: "test-a", capacity: 10 });
    expect(room.active).toBe(true);
    expect(
      (await listRoomsFor(user, false)).some((r) => r.id === room.id),
    ).toBe(true);
    expect((await getRoomFor(user, room.id)).id).toBe(room.id);
  });

  it("USER não edita sala", async () => {
    const room = await createRoom(admin, { name: "test-b", capacity: 10 });
    await expect(
      updateRoom(user, room.id, { capacity: 99 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect((await getRoomFor(admin, room.id)).capacity).toBe(10);
  });

  it("sala desativada some para USER (mesmo pedindo includeInactive) e continua para ADMIN", async () => {
    const room = await createRoom(admin, { name: "test-c", capacity: 10 });
    await updateRoom(admin, room.id, { active: false });

    expect((await listRoomsFor(user, true)).some((r) => r.id === room.id)).toBe(
      false,
    );
    await expect(getRoomFor(user, room.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect((await getRoomFor(admin, room.id)).active).toBe(false);
    expect(
      (await listRoomsFor(admin, true)).some((r) => r.id === room.id),
    ).toBe(true);
  });

  it("atualizar sala inexistente dá NotFound", async () => {
    await expect(
      updateRoom(admin, "00000000-0000-4000-8000-000000000000", {
        capacity: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
