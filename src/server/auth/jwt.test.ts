import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  signAccessToken,
  verifyAccessToken,
} from "@/server/auth/jwt";

const USER_ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
const TEST_SECRET = "test-only-secret-test-only-secret-test-only-secret-1234";

function decodePart(token: string, index: 0 | 1): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split(".")[index], "base64url").toString(),
  );
}

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("JWT de acesso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("assina e verifica um token válido", async () => {
    const token = await signAccessToken(USER_ID);
    expect(await verifyAccessToken(token)).toEqual({ userId: USER_ID });
  });

  it("não coloca dados sensíveis no payload", async () => {
    const payload = decodePart(await signAccessToken(USER_ID), 1);
    expect(Object.keys(payload).sort()).toEqual([
      "aud",
      "exp",
      "iat",
      "iss",
      "sub",
    ]);
  });

  it("usa HS256 e expira em 15 minutos", async () => {
    const token = await signAccessToken(USER_ID);
    const payload = decodePart(token, 1);
    expect(decodePart(token, 0).alg).toBe("HS256");
    expect((payload.exp as number) - (payload.iat as number)).toBe(15 * 60);
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(15 * 60);
  });

  it("aceita o token perto do fim da validade", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const token = await signAccessToken(USER_ID);
    vi.setSystemTime(Date.now() + 14 * 60 * 1000);
    expect(await verifyAccessToken(token)).toEqual({ userId: USER_ID });
  });

  it("recusa token expirado", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const token = await signAccessToken(USER_ID);
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("recusa payload adulterado", async () => {
    const [header, , signature] = (await signAccessToken(USER_ID)).split(".");
    const forged = encodePart({
      ...decodePart(await signAccessToken(USER_ID), 1),
      sub: "00000000-0000-4000-8000-000000000000",
    });
    expect(
      await verifyAccessToken(`${header}.${forged}.${signature}`),
    ).toBeNull();
  });

  it("recusa assinatura adulterada", async () => {
    const [header, payload] = (await signAccessToken(USER_ID)).split(".");
    expect(
      await verifyAccessToken(`${header}.${payload}.assinatura-falsa`),
    ).toBeNull();
  });

  it("recusa token assinado com outro segredo", async () => {
    const other = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER_ID)
      .setIssuer("reservas-api")
      .setAudience("reservas-web")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(
        new TextEncoder().encode(
          "outro-segredo-outro-segredo-outro-segredo-99",
        ),
      );
    expect(await verifyAccessToken(other)).toBeNull();
  });

  it("recusa token com algoritmo 'none'", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = `${encodePart({ alg: "none", typ: "JWT" })}.${encodePart({
      sub: USER_ID,
      iss: "reservas-api",
      aud: "reservas-web",
      iat: now,
      exp: now + 900,
    })}.`;
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("recusa outro algoritmo mesmo com o segredo correto (HS512)", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS512" })
      .setSubject(USER_ID)
      .setIssuer("reservas-api")
      .setAudience("reservas-web")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(TEST_SECRET));
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("recusa emissor ou audiência diferentes", async () => {
    const key = new TextEncoder().encode(TEST_SECRET);
    const build = (iss: string, aud: string) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(USER_ID)
        .setIssuer(iss)
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(key);
    expect(
      await verifyAccessToken(await build("outro-servico", "reservas-web")),
    ).toBeNull();
    expect(
      await verifyAccessToken(await build("reservas-api", "outro-cliente")),
    ).toBeNull();
  });

  it("recusa 'sub' que não é um UUID", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuer("reservas-api")
      .setAudience("reservas-web")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(TEST_SECRET));
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("recusa entradas inválidas sem lançar erro", async () => {
    for (const bad of ["", "abc", "a.b.c", "...", "Bearer xyz"]) {
      expect(await verifyAccessToken(bad)).toBeNull();
    }
  });
});
