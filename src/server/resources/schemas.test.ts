import { describe, it, expect } from "vitest";
import { createResourceSchema, updateResourceSchema } from "./schemas";
import { setRoomResourcesSchema } from "@/server/rooms/schemas";

describe("resource schemas", () => {
  it("normaliza o nome e rejeita campos extras", () => {
    expect(createResourceSchema.parse({ name: "  Projetor " }).name).toBe(
      "Projetor",
    );
    expect(
      createResourceSchema.safeParse({ name: "P", active: false }).success,
    ).toBe(false);
  });
  it("update exige ao menos um campo", () => {
    expect(updateResourceSchema.safeParse({}).success).toBe(false);
    expect(updateResourceSchema.safeParse({ active: false }).success).toBe(
      true,
    );
  });
  it("setRoomResources valida os ids", () => {
    expect(setRoomResourcesSchema.safeParse({ resourceIds: [] }).success).toBe(
      true,
    );
    expect(
      setRoomResourcesSchema.safeParse({ resourceIds: ["x"] }).success,
    ).toBe(false);
    expect(
      setRoomResourcesSchema.safeParse({ resourceIds: [], extra: 1 }).success,
    ).toBe(false);
  });
});
