import { describe, expect, it } from "vitest";
import {
  noteKey,
  parseRoomResourcesForm,
  QUANTITY_ERROR,
  quantityKey,
} from "./resources-form";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseRoomResourcesForm", () => {
  it("lista vazia é válida (sala sem recursos)", () => {
    expect(parseRoomResourcesForm([])).toEqual({
      ok: true,
      data: { items: [] },
    });
  });

  it("converte quantidade e normaliza a observação", () => {
    const result = parseRoomResourcesForm([
      { resourceId: A, quantity: " 2 ", note: "  Split 24.000 BTU  " },
      { resourceId: B, quantity: "1", note: "   " },
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          { resourceId: A, quantity: 2, note: "Split 24.000 BTU" },
          { resourceId: B, quantity: 1, note: null },
        ],
      },
    });
  });

  it.each(["", "  ", "abc", "2.5", "-1", "1e2", "١٢", "1000"])(
    "rejeita quantidade %j no campo do recurso",
    (quantity) => {
      const result = parseRoomResourcesForm([
        { resourceId: A, quantity, note: "" },
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors[quantityKey(A)]).toBe(QUANTITY_ERROR);
      }
    },
  );

  it.each(["0", "100", "999"])("rejeita %s (fora de 1 a 99)", (quantity) => {
    const result = parseRoomResourcesForm([
      { resourceId: A, quantity, note: "" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors[quantityKey(A)]).toBe(QUANTITY_ERROR);
    }
  });

  it("aceita os limites 1 e 99", () => {
    const result = parseRoomResourcesForm([
      { resourceId: A, quantity: "1", note: "" },
      { resourceId: B, quantity: "99", note: "" },
    ]);
    expect(result.ok).toBe(true);
  });

  it("observação com mais de 200 caracteres erra só no campo dela", () => {
    const result = parseRoomResourcesForm([
      { resourceId: A, quantity: "1", note: "x".repeat(201) },
      { resourceId: B, quantity: "1", note: "x".repeat(200) },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors)).toEqual([noteKey(A)]);
    }
  });

  it("recurso repetido ou id inválido viram erro geral, sem campo", () => {
    const duplicated = parseRoomResourcesForm([
      { resourceId: A, quantity: "1", note: "" },
      { resourceId: A, quantity: "1", note: "" },
    ]);
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) expect(duplicated.fieldErrors).toEqual({});

    const invalid = parseRoomResourcesForm([
      { resourceId: "nao-e-uuid", quantity: "1", note: "" },
    ]);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors).toEqual({});
      expect(invalid.message).toContain("inválido");
    }
  });

  it("mais de 50 recursos é rejeitado", () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({
      resourceId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      quantity: "1",
      note: "",
    }));
    expect(parseRoomResourcesForm(rows).ok).toBe(false);
  });
});
