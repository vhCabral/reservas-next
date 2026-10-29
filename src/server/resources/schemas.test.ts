import { describe, it, expect } from "vitest";
import { createResourceSchema, updateResourceSchema } from "./schemas";

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
});
