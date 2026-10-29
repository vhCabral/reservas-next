import { assertAdmin } from "@/server/auth/authorization";
import type { PublicUser } from "@/server/auth/users.repository";
import { ForbiddenError } from "@/server/http/errors";

export const NOT_ALLOWED = "Você não tem permissão para esta ação.";

// Lê um campo de texto do formulário (qualquer outra coisa vira texto vazio).
export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Devolve a mensagem de erro se NÃO for admin; null se for. Uma Server Action é
// um endpoint POST que qualquer pessoa pode chamar na mão: esta checagem vem
// ANTES de tudo, e o serviço confere de novo (defesa em duas camadas).
export function adminProblem(actor: PublicUser): string | null {
  try {
    assertAdmin(actor);
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return NOT_ALLOWED;
    throw error;
  }
}
