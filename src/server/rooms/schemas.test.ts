import { describe, it, expect } from "vitest";
import { createRoomSchema, updateRoomSchema, roomIdSchema } from "./schemas";

describe("room schemas", () => {
  it("cria com o mínimo e normaliza o nome", () => {
    expect(
      createRoomSchema.parse({ name: "  Sala 1 ", capacity: 10 }).name,
    ).toBe("Sala 1");
  });
  it("rejeita campos extras como active e id", () => {
    expect(
      createRoomSchema.safeParse({ name: "S", capacity: 1, active: false })
        .success,
    ).toBe(false);
    expect(
      createRoomSchema.safeParse({ name: "S", capacity: 1, id: "x" }).success,
    ).toBe(false);
  });
  it("rejeita capacidade inválida", () => {
    for (const capacity of [0, -1, 1.5, 10_001]) {
      expect(createRoomSchema.safeParse({ name: "S", capacity }).success).toBe(
        false,
      );
    }
  });
  it("update exige ao menos um campo e aceita active", () => {
    expect(updateRoomSchema.safeParse({}).success).toBe(false);
    expect(updateRoomSchema.safeParse({ active: false }).success).toBe(true);
  });
  it("valida o formato do id", () => {
    expect(roomIdSchema.safeParse("nao-e-uuid").success).toBe(false);
  });
});
