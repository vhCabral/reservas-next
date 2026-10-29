import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createResourceAction } from "@/app/actions/resources";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Novo recurso" };

export default function NovoRecursoPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/recursos"
          className="text-sm text-accent-600 hover:underline"
        >
          ← Recursos
        </Link>
        <h1 className="text-2xl font-semibold text-brand-900">Novo recurso</h1>
      </header>
      <Suspense
        fallback={
          <div
            className="h-56 max-w-xl animate-pulse rounded-2xl border border-line bg-white"
            aria-hidden="true"
          />
        }
      >
        <NewResourceContent />
      </Suspense>
    </div>
  );
}

async function NewResourceContent() {
  // Quem não é admin nem vê o formulário (a Action também confere).
  await requireAdminOrNotFound();
  return (
    <div className="max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm">
      <ResourceForm
        action={createResourceAction}
        submitLabel="Criar recurso"
        pendingText="Salvando…"
      />
    </div>
  );
}
