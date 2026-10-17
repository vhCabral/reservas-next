import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
} from "@/server/http/errors";
import {
  handleError,
  route,
  type ErrorBody,
} from "@/server/http/error-handler";

const PATH = "/api/reservations";

async function body(response: Response): Promise<ErrorBody> {
  return (await response.json()) as ErrorBody;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleError: erros do app", () => {
  it.each([
    [new BadRequestError("x"), 400, "Bad Request"],
    [new UnauthorizedError("x"), 401, "Unauthorized"],
    [new ForbiddenError("x"), 403, "Forbidden"],
    [new NotFoundError("x"), 404, "Not Found"],
    [new ConflictError("x"), 409, "Conflict"],
    [new UnprocessableEntityError("x"), 422, "Unprocessable Entity"],
  ])("%o vira status %i", async (error, status, text) => {
    const response = handleError(error, PATH);
    expect(response.status).toBe(status);
    expect((await body(response)).error).toBe(text);
  });

  it("usa o formato padronizado, em JSON, sem campos extras", async () => {
    const response = handleError(
      new ConflictError("Room is already reserved for this period"),
      PATH,
    );
    const json = await body(response);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(Object.keys(json).sort()).toEqual([
      "error",
      "message",
      "path",
      "status",
      "timestamp",
    ]);
    expect(json.message).toBe("Room is already reserved for this period");
    expect(json.path).toBe(PATH);
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
  });

  it("429 devolve o cabeçalho Retry-After", async () => {
    const response = handleError(new TooManyRequestsError(42.3), PATH);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("43");
  });

  it("AppError customizado respeita o status informado", async () => {
    expect(handleError(new AppError(418, "x"), PATH).status).toBe(418);
  });
});

describe("handleError: validação (Zod)", () => {
  it("vira 400 com os campos inválidos e sem ecoar os valores enviados", async () => {
    const result = z
      .object({ email: z.email(), password: z.string().min(10) })
      .safeParse({ email: "nao-e-email", password: "curta123" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const response = handleError(result.error, PATH);
    const json = await body(response);
    expect(response.status).toBe(400);
    expect(json.message).toBe("Validation failed");
    expect(json.details?.map((d) => d.field).sort()).toEqual([
      "email",
      "password",
    ]);
    expect(JSON.stringify(json)).not.toContain("curta123");
    expect(JSON.stringify(json)).not.toContain("nao-e-email");
  });
});

describe("handleError: erros do PostgreSQL", () => {
  // O Drizzle embrulha o erro do driver; simulamos os dois formatos.
  const direct = (code: string) => Object.assign(new Error("db"), { code });
  const wrapped = (code: string) =>
    Object.assign(new Error("Failed query"), { cause: direct(code) });

  it.each([
    ["23P01", 409, "Room is already reserved for this period"],
    ["23505", 409, "Resource already exists"],
    ["23503", 409, "Operation conflicts with related data"],
    ["23514", 422, "Data violates a validation rule"],
  ])("SQLSTATE %s vira %i", async (code, status, message) => {
    for (const error of [direct(code), wrapped(code)]) {
      const response = handleError(error, PATH);
      expect(response.status).toBe(status);
      expect((await body(response)).message).toBe(message);
    }
  });
});

describe("handleError: erro inesperado", () => {
  it("vira 500 genérico sem vazar a mensagem interna", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleError(
      new Error("password=hunter2 host=10.0.0.5"),
      PATH,
    );
    const text = JSON.stringify(await body(response));
    expect(response.status).toBe(500);
    expect(text).toContain("Internal server error");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("10.0.0.5");
    expect(text).not.toContain("stack");
  });

  it("registra no log sem a mensagem do erro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleError(new Error("password=hunter2 host=10.0.0.5"), PATH);
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = String(spy.mock.calls[0][0]);
    expect(logged).toContain('"errorName":"Error"');
    expect(logged).toContain(PATH);
    expect(logged).not.toContain("hunter2");
    expect(logged).not.toContain("10.0.0.5");
  });

  it("aceita valores que não são Error (ex.: string lançada)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleError("boom", PATH);
    expect(response.status).toBe(500);
  });
});

describe("route()", () => {
  it("devolve a resposta do handler quando não há erro", async () => {
    const handler = route(async () =>
      Response.json({ ok: true }, { status: 201 }),
    );
    const response = await handler(new Request("http://localhost/api/x"), {});
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("converte erros lançados e usa só o pathname (sem query string)", async () => {
    const handler = route(async () => {
      throw new NotFoundError("Room not found");
    });
    const response = await handler(
      new Request("http://localhost/api/rooms/123?token=segredo"),
      {},
    );
    const json = await body(response);
    expect(response.status).toBe(404);
    expect(json.path).toBe("/api/rooms/123");
    expect(JSON.stringify(json)).not.toContain("segredo");
  });
});
