import { describe, expect, it } from "vitest";
import { parseResourceForm, type ResourceFormValues } from "./form";

const valid: ResourceFormValues = {
  name: "Projetor",
  description: "Projetor Full HD com entrada HDMI.",
};

function errorsOf(values: Partial<ResourceFormValues>) {
  const result = parseResourceForm({ ...valid, ...values });
  if (result.ok) throw new Error("era esperado erro");
  return result.fieldErrors;
}

describe("parseResourceForm", () => {
  it("aceita um formulário válido", () => {
    expect(parseResourceForm(valid)).toEqual({
      ok: true,
      data: {
        name: "Projetor",
        description: "Projetor Full HD com entrada HDMI.",
      },
    });
  });

  it("transforma descrição vazia ou só com espaços em null", () => {
    expect(parseResourceForm({ ...valid, description: "" })).toMatchObject({
      ok: true,
      data: { description: null },
    });
    expect(parseResourceForm({ ...valid, description: "   " })).toMatchObject({
      ok: true,
      data: { description: null },
    });
  });

  it("remove espaços nas pontas do nome", () => {
    expect(parseResourceForm({ ...valid, name: "  Projetor  " })).toMatchObject(
      { ok: true, data: { name: "Projetor" } },
    );
  });

  it("recusa nome vazio, só com espaços ou com mais de 120 caracteres", () => {
    expect(errorsOf({ name: "" })).toHaveProperty("name");
    expect(errorsOf({ name: "   " })).toHaveProperty("name");
    expect(errorsOf({ name: "a".repeat(121) })).toHaveProperty("name");
  });

  it("recusa descrição com mais de 500 caracteres", () => {
    expect(errorsOf({ description: "a".repeat(501) })).toHaveProperty(
      "description",
    );
  });

  it("reporta os dois campos errados de uma vez", () => {
    const errors = errorsOf({ name: "", description: "a".repeat(501) });
    expect(Object.keys(errors).sort()).toEqual(["description", "name"]);
  });
});
