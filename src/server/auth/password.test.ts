import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyAgainstDummyHash,
  verifyPassword,
} from "@/server/auth/password";

describe("password hashing (Argon2id)", () => {
  it("gera hash Argon2id com os parâmetros da OWASP", async () => {
    const hash = await hashPassword("uma-senha-bem-longa-123");
    expect(hash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
  });

  it("não deixa a senha em texto puro dentro do hash", async () => {
    const plain = "uma-senha-bem-longa-123";
    expect(await hashPassword(plain)).not.toContain(plain);
  });

  it("usa salt: a mesma senha gera hashes diferentes", async () => {
    const [a, b] = await Promise.all([
      hashPassword("mesma-senha-123456"),
      hashPassword("mesma-senha-123456"),
    ]);
    expect(a).not.toBe(b);
  });

  it("aceita a senha correta", async () => {
    const hash = await hashPassword("senha-correta-123");
    expect(await verifyPassword(hash, "senha-correta-123")).toBe(true);
  });

  it("recusa a senha errada", async () => {
    const hash = await hashPassword("senha-correta-123");
    expect(await verifyPassword(hash, "senha-errada-123")).toBe(false);
  });

  it("diferencia maiúsculas de minúsculas", async () => {
    const hash = await hashPassword("SenhaSecreta123");
    expect(await verifyPassword(hash, "senhasecreta123")).toBe(false);
  });

  it("suporta Unicode e senhas de 128 caracteres", async () => {
    const unicode = "sénha-çãõ-日本語-🔐-123";
    const long = "a".repeat(128);
    expect(await verifyPassword(await hashPassword(unicode), unicode)).toBe(
      true,
    );
    expect(await verifyPassword(await hashPassword(long), long)).toBe(true);
  });

  it("trata hash malformado como falha, sem lançar erro", async () => {
    expect(await verifyPassword("isto-nao-e-um-hash", "qualquer-coisa")).toBe(
      false,
    );
    expect(await verifyPassword("", "qualquer-coisa")).toBe(false);
  });

  it("verifyAgainstDummyHash termina sem erro", async () => {
    await expect(
      verifyAgainstDummyHash("qualquer-senha-123"),
    ).resolves.toBeUndefined();
  });
});
