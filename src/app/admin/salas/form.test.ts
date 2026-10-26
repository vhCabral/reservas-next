import { describe, expect, it } from "vitest";
import { parseRoomForm, type RoomFormValues } from "./form";

const valid: RoomFormValues = {
  name: "Sala 3",
  capacity: "12",
  location: "Bloco A",
  description: "Sala com TV.",
};

function errorsOf(values: Partial<RoomFormValues>) {
  const result = parseRoomForm({ ...valid, ...values });
  if (result.ok) throw new Error("era esperado erro");
  return result.fieldErrors;
}

describe("parseRoomForm", () => {
  it("aceita um formulário válido e converte a capacidade em número", () => {
    expect(parseRoomForm(valid)).toEqual({
      ok: true,
      data: {
        name: "Sala 3",
        capacity: 12,
        location: "Bloco A",
        description: "Sala com TV.",
      },
    });
  });

  it("transforma local e descrição vazios em null", () => {
    const result = parseRoomForm({ ...valid, location: "  ", description: "" });
    expect(result).toMatchObject({
      ok: true,
      data: { location: null, description: null },
    });
  });

  it("remove espaços nas pontas do nome e da capacidade", () => {
    const result = parseRoomForm({ ...valid, name: "  Sala 3  ", capacity: " 12 " });
    expect(result).toMatchObject({ ok: true, data: { name: "Sala 3", capacity: 12 } });
  });

  it("recusa nome vazio ou só com espaços", () => {
    expect(errorsOf({ name: "" })).toHaveProperty("name");
    expect(errorsOf({ name: "   " })).toHaveProperty("name");
  });

  it("recusa nome com mais de 120 caracteres", () => {
    expect(errorsOf({ name: "a".repeat(121) })).toHaveProperty("name");
  });

  it.each(["", "abc", "0", "10001", "1e3", "-5", "1.5", "12abc", "1 2"])(
    "recusa a capacidade %j",
    (capacity) => {
      expect(errorsOf({ capacity })).toHaveProperty("capacity");
    },
  );

  it("aceita os limites da capacidade (1 e 10000)", () => {
    expect(parseRoomForm({ ...valid, capacity: "1" }).ok).toBe(true);
    expect(parseRoomForm({ ...valid, capacity: "10000" }).ok).toBe(true);
  });

  it("recusa local com mais de 120 e descrição com mais de 500 caracteres", () => {
    expect(errorsOf({ location: "a".repeat(121) })).toHaveProperty("location");
    expect(errorsOf({ description: "a".repeat(501) })).toHaveProperty(
      "description",
    );
  });

  it("reporta todos os campos errados de uma vez", () => {
    const errors = errorsOf({ name: "", capacity: "abc" });
    expect(Object.keys(errors).sort()).toEqual(["capacity", "name"]);
  });
});
