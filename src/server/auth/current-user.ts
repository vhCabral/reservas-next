import { notFound, redirect } from "next/navigation";
import { assertAdmin } from "@/server/auth/authorization";
import { requireUser } from "@/server/auth/session";
import type { PublicUser } from "@/server/auth/users.repository";
import { ForbiddenError, UnauthorizedError } from "@/server/http/errors";

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

/**
 * Para páginas que exigem login: devolve o usuário (o "actor" que os serviços
 * esperam) ou manda para /login. Cada página chama isto por conta própria: o
 * cabeçalho mostrar "Entrar" não protege nada, a checagem fica perto do dado.
 */
export async function requireUserOrLogin(): Promise<PublicUser> {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

/**
 * Para páginas de administração: sem login vai para /login; logado mas sem
 * ser ADMIN recebe "página não encontrada" (404), igual a uma página que não
 * existe — não revela que a área de admin está ali. A regra de quem é admin
 * continua sendo uma só (assertAdmin). O papel vem do banco a cada requisição.
 */
export async function requireAdminOrNotFound(): Promise<PublicUser> {
  const user = await requireUserOrLogin();
  try {
    assertAdmin(user);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
  return user;
}
