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

    expect(
      names(
        await setRoomResources(admin, room.id, [
          { resourceId: a.id },
          { resourceId: b.id },
        ]),
      ),
    ).toEqual(["test-a", "test-b"]);
    await setRoomResources(admin, room.id, [{ resourceId: b.id }]);
    expect(names(await listRoomResourcesFor(user, room.id))).toEqual([
      "test-b",
    ]);
  });

  it("sem quantidade vale 1, e observação vazia ou só com espaços vira null", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    const b = await createResource(admin, { name: "test-b" });

    const list = await setRoomResources(admin, room.id, [
      { resourceId: a.id },
      { resourceId: b.id, note: "   " },
    ]);
    expect(
      list.map((r) => ({ name: r.name, quantity: r.quantity, note: r.note })),
    ).toEqual([
      { name: "test-a", quantity: 1, note: null },
      { name: "test-b", quantity: 1, note: null },
    ]);
  });

  it("guarda quantidade e observação (sem espaços nas pontas) e USER vê os mesmos dados", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    const b = await createResource(admin, { name: "test-b" });

    await setRoomResources(admin, room.id, [
      { resourceId: a.id, quantity: 2, note: "  Split 24.000 BTU  " },
      { resourceId: b.id, quantity: 99 },
    ]);

    const seenByUser = await listRoomResourcesFor(user, room.id);
    expect(
      seenByUser.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        note: r.note,
      })),
    ).toEqual([
      { name: "test-a", quantity: 2, note: "Split 24.000 BTU" },
      { name: "test-b", quantity: 99, note: null },
    ]);
  });

  it("a quantidade e a observação mudam quando o conjunto é substituído", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await setRoomResources(admin, room.id, [
      { resourceId: a.id, quantity: 2, note: "antigo" },
    ]);

    const list = await setRoomResources(admin, room.id, [
      { resourceId: a.id, quantity: 3 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ quantity: 3, note: null });
  });

  it("USER não altera os recursos da sala, nem com lista inválida", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    await expect(setRoomResources(user, room.id, [])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    // A checagem de admin vem antes da validação: 403, e não 422.
    await expect(
      setRoomResources(user, room.id, [{ resourceId: NO_SUCH_ID, quantity: 0 }]),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("id desconhecido dá 422 e o conjunto anterior é mantido", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await setRoomResources(admin, room.id, [{ resourceId: a.id }]);

    await expect(
      setRoomResources(admin, room.id, [
        { resourceId: a.id },
        { resourceId: NO_SUCH_ID },
      ]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    expect(names(await listRoomResourcesFor(admin, room.id))).toEqual([
      "test-a",
    ]);
  });

  it.each([0, 100, 1.5, -1])(
    "quantidade %s dá 422 e o conjunto anterior é mantido",
    async (quantity) => {
      const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
      const a = await createResource(admin, { name: "test-a" });
      await setRoomResources(admin, room.id, [{ resourceId: a.id, quantity: 2 }]);

      await expect(
        setRoomResources(admin, room.id, [{ resourceId: a.id, quantity }]),
      ).rejects.toBeInstanceOf(UnprocessableEntityError);
      expect(await listRoomResourcesFor(admin, room.id)).toMatchObject([
        { quantity: 2 },
      ]);
    },
  );

  it("observação com mais de 200 caracteres dá 422", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await expect(
      setRoomResources(admin, room.id, [
        { resourceId: a.id, note: "x".repeat(201) },
      ]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    // No limite (200) é aceito.
    const list = await setRoomResources(admin, room.id, [
      { resourceId: a.id, note: "x".repeat(200) },
    ]);
    expect(list[0]?.note).toHaveLength(200);
  });

  it("o mesmo recurso duas vezes na lista dá 422", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await expect(
      setRoomResources(admin, room.id, [
        { resourceId: a.id, quantity: 1 },
        { resourceId: a.id, quantity: 2 },
      ]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
  });

  it("recurso inativo some para USER, aparece para ADMIN e não pode ser vinculado", async () => {
    const room = await createRoom(admin, { name: "test-sala", capacity: 10 });
    const a = await createResource(admin, { name: "test-a" });
    await setRoomResources(admin, room.id, [{ resourceId: a.id }]);
    await updateResource(admin, a.id, { active: false });

    expect(await listRoomResourcesFor(user, room.id)).toEqual([]);
    expect(names(await listRoomResourcesFor(admin, room.id))).toEqual([
      "test-a",
    ]);
    await expect(
      setRoomResources(admin, room.id, [{ resourceId: a.id }]),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
  });

  it("sala inexistente dá NotFound", async () => {
    await expect(
      setRoomResources(admin, NO_SUCH_ID, []),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
