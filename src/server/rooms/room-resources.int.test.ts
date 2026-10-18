import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/server/db";
import { resources, rooms, users } from "@/server/db/schema";
import { registerUser } from "@/server/auth/auth.service";
import type { PublicUser } from "@/server/auth/users.repository";
import { createRoom } from "./rooms.service";
import {
  listRoomResourcesFor,
  setRoomResources,
} from "./room-resources.service";
import {
  createResource,
  updateResource,
} from "@/server/resources/resources.service";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/server/http/errors";

const DOMAIN = "@resources-test.invalid";
const password = "uma-senha-longa-1";
const NO_SUCH_ID = "00000000-0000-4000-8000-000000000000";
let admin: PublicUser;
let user: PublicUser;

beforeEach(async () => {
  user = await registerUser({ name: "User", email: `user${DOMAIN}`, password });
  const created = await registerUser({
    name: "Admin",
    email: `admin${DOMAIN}`,
    password,
  });
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, created.id));
  admin = { ...created, role: "ADMIN" };
});

afterEach(async () => {
  await db.delete(rooms).where(like(rooms.name, "test-%"));
  await db.delete(resources).where(like(resources.name, "test-%"));
  await db.delete(users).where(like(users.email, `%${DOMAIN}`));
});

const names = (list: { name: string }[]) => list.map((r) => r.name);

describe("resources", () => {
  it("USER não cria recurso", async () => {
    await expect(
      createResource(user, { name: "test-x" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("nome duplicado dá ConflictError", async () => {
    await createResource(admin, { name: "test-projetor" });
    await expect(
      createResource(admin, { name: "test-projetor" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("recursos da sala", () => {
  it("ADMIN define o conjunto, USER lista, e trocar o conjunto remove os antigos", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    const b = await createResource(admin, { name: "test-b" });

    expect(names(await setRoomResources(admin, room.id, [a.id, b.id]))).toEqual(
      ["test-a", "test-b"],
    );
    await setRoomResources(admin, room.id, [b.id]);
    expect(names(await listRoomResourcesFor(user, room.id))).toEqual([
      "test-b",
    ]);
  });

  it("USER não altera os recursos da sala", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    await expect(setRoomResources(user, room.id, [])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("id desconhecido dá 422 e o conjunto anterior é mantido", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await setRoomResources(admin, room.id, [a.id]);

    await expect(
      setRoomResources(admin, room.id, [a.id, NO_SUCH_ID]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    expect(names(await listRoomResourcesFor(admin, room.id))).toEqual([
      "test-a",
    ]);
  });

  it("recurso inativo some para USER, aparece para ADMIN e não pode ser vinculado", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await setRoomResources(admin, room.id, [a.id]);
    await updateResource(admin, a.id, { active: false });

    expect(await listRoomResourcesFor(user, room.id)).toEqual([]);
    expect(names(await listRoomResourcesFor(admin, room.id))).toEqual([
      "test-a",
    ]);
    await expect(
      setRoomResources(admin, room.id, [a.id]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
  });

  it("sala inexistente dá NotFound", async () => {
    await expect(
      setRoomResources(admin, NO_SUCH_ID, []),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
