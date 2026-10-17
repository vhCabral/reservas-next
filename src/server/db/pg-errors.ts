import "server-only";

// Códigos SQLSTATE do PostgreSQL que o app sabe interpretar.
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";
export const PG_EXCLUSION_VIOLATION = "23P01";

// O Drizzle embrulha o erro do driver em outro erro. O código do PostgreSQL
// pode estar no erro em si ou em algum nível de "cause", então percorremos a cadeia.
export function getDbErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 5 && typeof current === "object" && current;
    depth++
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
