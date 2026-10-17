import "server-only";

// Erros "esperados" do app. A mensagem é escrita por nós e pode ir ao cliente.
export class AppError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.headers = headers;
  }
}

// 400: requisição malformada ou dados que não passam na validação de formato.
export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

// 401: sem credenciais válidas.
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message);
  }
}

// 403: autenticado, mas sem permissão.
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, message);
  }
}

// 404: não existe (ou o usuário não pode saber que existe).
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

// 409: conflito com o estado atual (e-mail já cadastrado, horário ocupado).
export class ConflictError extends AppError {
  constructor(message = "Conflict with the current state of the resource") {
    super(409, message);
  }
}

// 422: dados bem formados, mas que violam uma regra de negócio.
export class UnprocessableEntityError extends AppError {
  constructor(message = "Request violates a business rule") {
    super(422, message);
  }
}

// 429: limite de tentativas excedido.
export class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds: number, message = "Too many requests") {
    super(429, message, {
      "Retry-After": String(Math.ceil(retryAfterSeconds)),
    });
  }
}
