import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { listResourcesFor } from "@/server/resources/resources.service";
import { AdminNav } from "../admin-nav";

export const metadata: Metadata = { title: "Administração: recursos" };

export default function AdminRecursosPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            Administração
          </p>
          <h1 className="text-2xl font-semibold text-brand-900">Recursos</h1>
        </div>
        <Link
          href="/admin/recursos/novo"
          className="rounded-full bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          Novo recurso
        </Link>
      </header>
      <AdminNav current="recursos" />
      <Suspense fallback={<ListSkeleton />}>
        <AdminResourceList />
      </Suspense>
    </div>
  );
}

async function AdminResourceList() {
  const actor = await requireAdminOrNotFound();
  // true = inclui recursos inativos (o serviço só honra isso para ADMIN).
  const resources = await listResourcesFor(actor, true);

  if (resources.length === 0) {
    return <p className="text-muted">Nenhum recurso cadastrado ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {resources.map((resource) => (
        <li
          key={resource.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm"
        >
          <div className="min-w-0">
            <p className="font-semibold text-brand-900">{resource.name}</p>
            {resource.description ? (
              <p className="line-clamp-2 text-sm text-muted">
                {resource.description}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                resource.active
                  ? "bg-green-50 text-green-800"
                  : "bg-slate-100 text-muted"
              }`}
            >
              {resource.active ? "Ativo" : "Inativo"}
            </span>
            <Link
              href={`/admin/recursos/${resource.id}`}
              className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-600"
            >
              Editar
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-line bg-white"
        />
      ))}
    </div>
  );
}
