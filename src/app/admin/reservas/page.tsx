import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cancelReservationAction } from "@/app/actions/reservations";
import { splitReservations, statusInfo } from "@/app/minhas-reservas/agrupar";
import type { StatusInfo } from "@/app/minhas-reservas/agrupar";
import { describeWindow } from "@/app/salas/horarios";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { getUserLabels } from "@/server/auth/user-labels";
import { listReservationsFor } from "@/server/reservations/reservations.service";
import { getRoomNames } from "@/server/rooms/room-names";
import { AdminNav } from "../admin-nav";
import { AdminCancelButton } from "./admin-cancel-button";
import { adminCanCancel } from "./cancelamento";

export const metadata: Metadata = { title: "Administração: reservas" };

const TONE: Record<StatusInfo["tone"], string> = {
  ok: "bg-green-50 text-green-800",
  info: "bg-accent-50 text-brand-900",
  muted: "bg-slate-100 text-muted",
};

export default function AdminReservasPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Administração
        </p>
        <h1 className="text-2xl font-semibold text-brand-900">Reservas</h1>
      </header>
      <AdminNav current="reservas" />
      <Suspense fallback={<ListSkeleton />}>
        <AdminReservationList />
      </Suspense>
    </div>
  );
}

async function AdminReservationList() {
  const actor = await requireAdminOrNotFound();
  // scope "all": o serviço só aceita para ADMIN e confere de novo.
  const reservations = await listReservationsFor(actor, { scope: "all" });
  // O relógio só é lido DEPOIS da sessão (Cache Components).
  const now = new Date();
  const [roomNames, people] = await Promise.all([
    getRoomNames([...new Set(reservations.map((r) => r.roomId))]),
    getUserLabels(actor, [...new Set(reservations.map((r) => r.userId))]),
  ]);
  const { upcoming, history } = splitReservations(reservations, now);

  if (reservations.length === 0) {
    return <p className="text-muted">Nenhuma reserva foi feita ainda.</p>;
  }

  const renderItem = (r: (typeof reservations)[number]) => {
    const status = statusInfo(r, now);
    const person = people.get(r.userId);
    return (
      <li
        key={r.id}
        className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link
              href={`/salas/${r.roomId}`}
              className="font-semibold text-brand-900 hover:underline"
            >
              {roomNames.get(r.roomId) ?? "Sala"}
            </Link>
            <p className="text-sm text-muted first-letter:uppercase">
              {describeWindow(r.startAt, r.endAt)}
            </p>
            <p className="text-sm text-ink">
              Reservado por{" "}
              <span className="font-medium">{person?.name ?? "usuário"}</span>
              {person ? (
                <span className="text-muted"> ({person.email})</span>
              ) : null}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${TONE[status.tone]}`}
          >
            {status.label}
          </span>
        </div>
        {adminCanCancel(r, now) ? (
          <AdminCancelButton action={cancelReservationAction.bind(null, r.id)} />
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-semibold text-brand-900">Próximas</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma reserva futura.</p>
        ) : (
          <ul className="space-y-3">{upcoming.map(renderItem)}</ul>
        )}
      </section>
      {history.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-brand-900">Histórico</h2>
          <ul className="space-y-3">{history.map(renderItem)}</ul>
        </section>
      ) : null}
      {reservations.length >= 100 ? (
        <p className="text-sm text-muted">
          Mostrando as 100 reservas mais recentes.
        </p>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-line bg-white"
        />
      ))}
    </div>
  );
}
