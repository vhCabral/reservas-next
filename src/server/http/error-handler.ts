import "server-only";
import { ZodError } from "zod";
import {
  getDbErrorCode,
  PG_CHECK_VIOLATION,
  PG_EXCLUSION_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from "@/server/db/pg-errors";
import { AppError } from "@/server/http/errors";

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

export type ErrorBody = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details?: { field: string; message: string }[];
};

function buildResponse(
  status: number,
  message: string,
  path: string,
  options: {
    details?: ErrorBody["details"];
    headers?: Record<string, string>;
  } = {},
): Response {
  const body: ErrorBody = {
    timestamp: new Date().toISOString(),
    status,
    error: STATUS_TEXT[status] ?? "Error",
    message,
    path,
    ...(options.details ? { details: options.details } : {}),
  };
  return Response.json(body, { status, headers: options.headers });
}

// Log estruturado e seguro: sem mensagem do erro (pode conter valores de colunas,
// e-mails etc.), só o tipo, o código do banco e os frames da pilha.
function logUnexpected(error: unknown, path: string): void {
  const err = error instanceof Error ? error : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Unhandled error in route",
      path,
      errorName: err?.name ?? typeof error,
      dbCode: getDbErrorCode(error),
      frames: err?.stack
        ?.split("\n")
        .filter((line) => line.trimStart().startsWith("at "))
        .slice(0, 15),
    }),
  );
}

export function handleError(error: unknown, path: string): Response {
  if (error instanceof AppError) {
    return buildResponse(error.status, error.message, path, {
      headers: error.headers,
    });
  }

  if (error instanceof ZodError) {
    // Só o campo e a mensagem de regra: nunca o valor enviado (pode ser uma senha).
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return buildResponse(400, "Validation failed", path, { details });
  }

  // Rede de segurança: violações de constraint que os serviços não trataram.
  switch (getDbErrorCode(error)) {
    case PG_EXCLUSION_VIOLATION:
      return buildResponse(
        409,
        "Room is already reserved for this period",
        path,
      );
    case PG_UNIQUE_VIOLATION:
      return buildResponse(409, "Resource already exists", path);
    case PG_FOREIGN_KEY_VIOLATION:
      return buildResponse(409, "Operation conflicts with related data", path);
    case PG_CHECK_VIOLATION:
      return buildResponse(422, "Data violates a validation rule", path);
  }

  logUnexpected(error, path);
  return buildResponse(500, "Internal server error", path);
}

export type RouteHandler<Ctx = unknown> = (
  request: Request,
  context: Ctx,
) => Promise<Response>;

// Envolve um handler de rota: qualquer erro vira uma resposta padronizada.
export function route<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
): RouteHandler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Só o pathname: a query string pode carregar dados sensíveis.
      return handleError(error, new URL(request.url).pathname);
    }
  };
}
