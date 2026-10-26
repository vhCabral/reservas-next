import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth/current-user";

// A parte que lê a sessão fica dentro de <Suspense> (exigência do Cache
// Components). O resto do cabeçalho entra no HTML estático e aparece na hora.
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-brand-900">
          Reservas de Salas
        </Link>
        <Suspense fallback={<div className="h-8 w-32" aria-hidden="true" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/login" className="text-ink hover:underline">
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="rounded-full bg-brand-900 px-4 py-1.5 font-medium text-white hover:bg-brand-800"
        >
          Cadastrar
        </Link>
      </nav>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/salas" className="text-ink hover:underline">
        Salas
      </Link>
      <Link href="/minhas-reservas" className="text-ink hover:underline">
        Minhas reservas
      </Link>
      <span className="flex items-center text-ink" title={user.name}>
        <span className="hidden sm:inline">Olá,&nbsp;</span>
        <strong className="max-w-32 truncate">{firstName}</strong>
        {user.role === "ADMIN" ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
            admin
          </span>
        ) : null}
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-1.5 text-ink hover:bg-surface"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
