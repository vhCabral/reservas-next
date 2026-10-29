import { describe, expect, it } from "vitest";
import { setRoomResourcesSchema } from "./schemas";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const ok = (value: unknown) => setRoomResourcesSchema.safeParse(value).success;

describe("setRoomResourcesSchema", () => {
  it("aceita lista vazia (a sala fica sem recursos)", () => {
    expect(ok({ items: [] })).toBe(true);
  });

  it("sem quantity vale 1, e note é opcional (ausente ou null)", () => {
    const result = setRoomResourcesSchema.parse({
      items: [{ resourceId: ID_A }, { resourceId: ID_B, note: null }],
    });
    expect(result.items.map((i) => i.quantity)).toEqual([1, 1]);
  });

  it("aceita quantidade e observação, e apara os espaços da observação", () => {
    const result = setRoomResourcesSchema.parse({
      items: [{ resourceId: ID_A, quantity: 2, note: "  Epson EB-X06  " }],
    });
    expect(result.items[0]).toEqual({
      resourceId: ID_A,
      quantity: 2,
      note: "Epson EB-X06",
    });
  });

  it("aceita os limites: quantidade 1 e 99, observação de 200 caracteres", () => {
    expect(ok({ items: [{ resourceId: ID_A, quantity: 1 }] })).toBe(true);
    expect(ok({ items: [{ resourceId: ID_A, quantity: 99 }] })).toBe(true);
    expect(ok({ items: [{ resourceId: ID_A, note: "x".repeat(200) }] })).toBe(
      true,
    );
  });

  it.each([0, 100, -1, 1.5, "2", null])(
    "recusa a quantidade %j",
    (quantity) => {
      expect(ok({ items: [{ resourceId: ID_A, quantity }] })).toBe(false);
    },
  );

  it("recusa observação com mais de 200 caracteres", () => {
    expect(ok({ items: [{ resourceId: ID_A, note: "x".repeat(201) }] })).toBe(
      false,
    );
  });

  it("recusa id que não é UUID", () => {
    expect(ok({ items: [{ resourceId: "x" }] })).toBe(false);
  });

  it("recusa o mesmo recurso duas vezes", () => {
    expect(
      ok({
        items: [
          { resourceId: ID_A, quantity: 1 },
          { resourceId: ID_A, quantity: 2 },
        ],
      }),
    ).toBe(false);
  });

  it("recusa mais de 50 recursos", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      resourceId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    }));
    expect(ok({ items: many })).toBe(false);
    expect(ok({ items: many.slice(0, 50) })).toBe(true);
  });

  it("recusa campos desconhecidos no corpo e em cada item (mass assignment)", () => {
    expect(ok({ items: [], extra: 1 })).toBe(false);
    expect(ok({ items: [{ resourceId: ID_A, active: true }] })).toBe(false);
  });

  it("recusa o formato antigo { resourceIds }", () => {
    expect(ok({ resourceIds: [ID_A] })).toBe(false);
  });
});
