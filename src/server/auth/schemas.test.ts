import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./schemas";

const valid = {
  name: "  Ana  ",
  email: "  ANA@Example.COM ",
  password: "uma-senha-longa-1",
};

describe("registerSchema", () => {
  it("normaliza nome e email", () => {
    const r = registerSchema.parse(valid);
    expect(r.name).toBe("Ana");
    expect(r.email).toBe("ana@example.com");
  });
  it("rejeita campo extra como role (mass assignment)", () => {
    expect(registerSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(
      false,
    );
  });
  it("rejeita senha curta e longa demais", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "curta123" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...valid, password: "a".repeat(129) }).success,
    ).toBe(false);
  });
  it("não aplica trim na senha", () => {
    const r = registerSchema.parse({
      ...valid,
      password: "  espacos-no-meio  ",
    });
    expect(r.password).toBe("  espacos-no-meio  ");
  });
  it("rejeita email inválido", () => {
    expect(
      registerSchema.safeParse({ ...valid, email: "nao-e-email" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("aceita senha curta (o erro uniforme é decidido no serviço)", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success,
    ).toBe(true);
  });
});
