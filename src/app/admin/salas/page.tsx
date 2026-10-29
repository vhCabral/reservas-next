import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { listRoomsFor } from "@/server/rooms/rooms.service";
import { AdminNav } from "../admin-nav";

export const metadata: Metadata = { title: "Administração: salas" };

export default function AdminSalasPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            Administração
          </p>
          <h1 className="text-2xl font-semibold text-brand-900">Salas</h1>
        </div>
        <Link
          href="/admin/salas/nova"
          className="rounded-full bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          Nova sala
        </Link>
      </header>
      <AdminNav current="salas" />
      <Suspense fallback={<ListSkeleton />}>
        <AdminRoomList />
      </Suspense>
    </div>
  );
}

async function AdminRoomList() {
  const actor = await requireAdminOrNotFound();
  // true = inclui salas inativas (o serviço só honra isso para ADMIN).
  const rooms = await listRoomsFor(actor, true);

  if (rooms.length === 0) {
    return <p className="text-muted">Nenhuma sala cadastrada ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {rooms.map((room) => (
        <li
          key={room.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm"
        >
          <div>
            <Link
              href={`/salas/${room.id}`}
              className="font-semibold text-brand-900 hover:underline"
            >
              {room.name}
            </Link>
            <p className="text-sm text-muted">
              {room.capacity} {room.capacity === 1 ? "lugar" : "lugares"}
              {room.location ? ` · ${room.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                room.active
                  ? "bg-green-50 text-green-800"
                  : "bg-slate-100 text-muted"
              }`}
            >
              {room.active ? "Ativa" : "Inativa"}
            </span>
            <Link
              href={`/admin/salas/${room.id}`}
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
