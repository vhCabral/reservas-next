import { requireUser } from "@/server/auth/session";
import { UnauthorizedError } from "@/server/http/errors";

// Dados mínimos que a tela pode ver. Nunca devolva o registro inteiro do banco
// (hash de senha, etc.): o que sai daqui pode ir parar no HTML.
export type CurrentUser = {
  id: string;
  name: string;
  role: "USER" | "ADMIN";
};

/**
 * Usuário logado ou null. SEM cache de propósito: o papel é lido do banco a
 * cada requisição. Só chame dentro de <Suspense> (lê cookies()).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const user = await requireUser();
    return { id: user.id, name: user.name, role: user.role };
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}
