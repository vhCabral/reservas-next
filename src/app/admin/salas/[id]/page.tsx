import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateRoomAction } from "@/app/actions/rooms";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { NotFoundError } from "@/server/http/errors";
import { getRoomFor } from "@/server/rooms/rooms.service";
import { roomIdSchema } from "@/server/rooms/schemas";
import { RoomForm } from "../room-form";
import { ActiveToggle } from "./active-toggle";

export const metadata: Metadata = { title: "Editar sala" };

export default function EditarSalaPage({
  params,
}: PageProps<"/admin/salas/[id]">) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/salas"
          className="text-sm text-accent-600 hover:underline"
        >
          ← Salas
        </Link>
        <h1 className="text-2xl font-semibold text-brand-900">Editar sala</h1>
      </header>
      {/* params é dado de requisição: lido dentro do <Suspense>. */}
      <Suspense
        fallback={
          <div
            className="h-80 max-w-xl animate-pulse rounded-2xl border border-line bg-white"
            aria-hidden="true"
          />
        }
      >
        <EditRoomContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditRoomContent({
  params,
}: {
  params: PageProps<"/admin/salas/[id]">["params"];
}) {
  const actor = await requireAdminOrNotFound();

  // O id vem da URL: entrada não confiável. Inválido = 404, sem consultar o banco.
  const parsed = roomIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  let room;
  try {
    room = await getRoomFor(actor, parsed.data); // admin enxerga sala inativa
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-3 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-brand-900">Situação</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              room.active
                ? "bg-green-50 text-green-800"
                : "bg-slate-100 text-muted"
            }`}
          >
            {room.active ? "Ativa" : "Inativa"}
          </span>
        </div>
        <ActiveToggle key={String(room.active)} roomId={room.id} active={room.active} />
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-brand-900">Dados da sala</h2>
        <RoomForm
          action={updateRoomAction.bind(null, room.id)}
          initial={{
            name: room.name,
            capacity: String(room.capacity),
            location: room.location ?? "",
            description: room.description ?? "",
          }}
          submitLabel="Salvar alterações"
          pendingText="Salvando…"
        />
      </section>
    </div>
  );
}
