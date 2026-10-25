import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUserOrLogin } from "@/server/auth/current-user";
import { listRoomsFor } from "@/server/rooms/rooms.service";

export const metadata: Metadata = { title: "Salas" };

export default function SalasPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Espaços
        </p>
        <h1 className="text-2xl font-semibold text-brand-900">
          Salas e auditórios
        </h1>
      </header>
      {/* A lista lê a sessão e o banco: precisa ficar dentro de <Suspense>. */}
      <Suspense fallback={<ListSkeleton />}>
        <RoomList />
      </Suspense>
    </div>
  );
}

async function RoomList() {
  const actor = await requireUserOrLogin();
  const rooms = await listRoomsFor(actor, false); // só salas ativas

  if (rooms.length === 0) {
    return <p className="text-muted">Nenhuma sala cadastrada ainda.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rooms.map((room) => (
        <li key={room.id}>
          <Link
            href={`/salas/${room.id}`}
            className="block h-full rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-accent-600 focus-visible:outline-2 focus-visible:outline-accent-600"
          >
            <h2 className="font-semibold text-brand-900">{room.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {room.capacity} {room.capacity === 1 ? "lugar" : "lugares"}
              {room.location ? ` · ${room.location}` : ""}
            </p>
            {room.description ? (
              <p className="mt-3 line-clamp-2 text-sm text-ink">
                {room.description}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-line bg-white"
        />
      ))}
    </div>
  );
}
