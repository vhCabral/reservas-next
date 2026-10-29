import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  setResourceActiveAction,
  updateResourceAction,
} from "@/app/actions/resources";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { listResourcesFor } from "@/server/resources/resources.service";
import { resourceIdSchema } from "@/server/resources/schemas";
import { ActiveToggle } from "../../active-toggle";
import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Editar recurso" };

export default function EditarRecursoPage({
  params,
}: PageProps<"/admin/recursos/[id]">) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/recursos"
          className="text-sm text-accent-600 hover:underline"
        >
          ← Recursos
        </Link>
        <h1 className="text-2xl font-semibold text-brand-900">
          Editar recurso
        </h1>
      </header>
      {/* params é dado de requisição: lido dentro do <Suspense>. */}
      <Suspense
        fallback={
          <div
            className="h-72 max-w-xl animate-pulse rounded-2xl border border-line bg-white"
            aria-hidden="true"
          />
        }
      >
        <EditResourceContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditResourceContent({
  params,
}: {
  params: PageProps<"/admin/recursos/[id]">["params"];
}) {
  const actor = await requireAdminOrNotFound();

  // O id vem da URL: entrada não confiável. Inválido = 404, sem consultar o banco.
  const parsed = resourceIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  // O serviço não tem "buscar um recurso": o catálogo é pequeno, então busca
  // a lista completa (admin vê inativos) e procura o id nela.
  const resources = await listResourcesFor(actor, true);
  const resource = resources.find((r) => r.id === parsed.data);
  if (!resource) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-3 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-brand-900">Situação</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              resource.active
                ? "bg-green-50 text-green-800"
                : "bg-slate-100 text-muted"
            }`}
          >
            {resource.active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <ActiveToggle
          key={String(resource.active)}
          active={resource.active}
          action={setResourceActiveAction.bind(
            null,
            resource.id,
            !resource.active,
          )}
          noun="recurso"
          deactivateWarning="Desativar este recurso? Ele deixa de aparecer nas salas para os usuários e não poderá ser adicionado a salas até ser reativado."
        />
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-brand-900">Dados do recurso</h2>
        <ResourceForm
          action={updateResourceAction.bind(null, resource.id)}
          initial={{
            name: resource.name,
            description: resource.description ?? "",
          }}
          submitLabel="Salvar alterações"
          pendingText="Salvando…"
        />
      </section>
    </div>
  );
}
