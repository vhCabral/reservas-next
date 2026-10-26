import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUserOrLogin } from "@/server/auth/current-user";
import { listReservationsFor } from "@/server/reservations/reservations.service";
import { getRoomNames } from "@/server/rooms/room-names";
import { describeWindow } from "../salas/horarios";
import {
  canCancel,
  splitReservations,
  statusInfo,
  type StatusInfo,
} from "./agrupar";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Minhas reservas" };

export default function MinhasReservasPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Agenda
        </p>
        <h1 className="text-2xl font-semibold text-brand-900">
          Minhas reservas
        </h1>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <MyReservations />
      </Suspense>
    </div>
  );
}

const TONE: Record<StatusInfo["tone"], string> = {
  ok: "bg-green-50 text-green-800",
  info: "bg-accent-50 text-brand-900",
  muted: "bg-slate-100 text-muted",
};

async function MyReservations() {
  const actor = await requireUserOrLogin();
  // scope "mine": o serviço devolve só as reservas de quem está logado.
  const reservations = await listReservationsFor(actor, { scope: "mine" });
  // O relógio só é lido DEPOIS da sessão (Cache Components).
  const now = new Date();
  const names = await getRoomNames([
    ...new Set(reservations.map((r) => r.roomId)),
  ]);
  const { upcoming, history } = splitReservations(reservations, now);

  if (reservations.length === 0) {
    return (
      <p className="text-muted">
        Você ainda não tem reservas.{" "}
        <Link href="/salas" className="text-accent-600 hover:underline">
          Ver salas
        </Link>
      </p>
    );
  }

  const renderItem = (r: (typeof reservations)[number]) => {
    const status = statusInfo(r, now);
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
              {names.get(r.roomId) ?? "Sala"}
            </Link>
            <p className="text-sm text-muted first-letter:uppercase">
              {describeWindow(r.startAt, r.endAt)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${TONE[status.tone]}`}
          >
            {status.label}
          </span>
        </div>
        {canCancel(r, now) ? <CancelButton reservationId={r.id} /> : null}
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
          {reservations.length >= 100 ? (
            <p className="text-sm text-muted">
              Mostrando as 100 reservas mais recentes.
            </p>
          ) : null}
        </section>
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
          className="h-24 animate-pulse rounded-2xl border border-line bg-white"
        />
      ))}
    </div>
  );
}
