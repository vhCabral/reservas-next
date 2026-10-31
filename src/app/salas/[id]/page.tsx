import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserOrLogin } from "@/server/auth/current-user";
import { NotFoundError } from "@/server/http/errors";
import { getRoomAvailability } from "@/server/reservations/reservations.service";
import { listRoomResourcesFor } from "@/server/rooms/room-resources.service";
import { getRoomFor } from "@/server/rooms/rooms.service";
import { roomIdSchema } from "@/server/rooms/schemas";
import { APP_TIMEZONE, buildSchedule, dayKey } from "../horarios";
import { ReservationForm } from "./reservation-form";

export const metadata: Metadata = { title: "Sala" };

const DAYS_AHEAD = 7; // bem abaixo do limite de 31 dias da API
const MAX_ADVANCE_DAYS = 90; // mesma regra da política de reservas

export default function SalaPage({ params }: PageProps<"/salas/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/salas" className="text-sm text-accent-600 hover:underline">
        ← Todas as salas
      </Link>
      {/* params é dado de requisição: lido dentro do <Suspense>. */}
      <Suspense fallback={<DetailSkeleton />}>
        <RoomDetail params={params} />
      </Suspense>
    </div>
  );
}

async function RoomDetail({
  params,
}: {
  params: PageProps<"/salas/[id]">["params"];
}) {
  const actor = await requireUserOrLogin();

  // O id vem da URL: é entrada não confiável. Inválido = 404, sem consultar o banco.
  const parsed = roomIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  let room;
  try {
    // Sala inexistente e sala inativa (para USER) dão o mesmo 404.
    room = await getRoomFor(actor, parsed.data);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // O relógio só é lido DEPOIS da sessão (dado de requisição), como o Cache
  // Components exige para new Date().
  const now = new Date();
  const to = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const [resources, busy] = await Promise.all([
    listRoomResourcesFor(actor, room.id),
    getRoomAvailability(actor, room.id, now, to),
  ]);
  const schedule = buildSchedule(busy, now, DAYS_AHEAD);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-brand-900">{room.name}</h1>
        <p className="text-sm text-muted">
          {room.capacity} {room.capacity === 1 ? "lugar" : "lugares"}
          {room.location ? ` · ${room.location}` : ""}
          {!room.active ? " · sala inativa (só admin vê)" : ""}
        </p>
        {room.description ? (
          <p className="text-ink">{room.description}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-brand-900">Recursos</h2>
        {resources.length === 0 ? (
          <p className="text-sm text-muted">Nenhum recurso cadastrado.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {resources.map((r) => (
              <li
                key={r.id}
                title={r.description ?? undefined}
                className="rounded-full bg-accent-50 px-3 py-1 text-sm text-brand-900"
              >
                {r.quantity > 1 ? `${r.quantity}× ` : ""}
                {r.name}
                {r.note ? ` — ${r.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-brand-900">
            Horários ocupados, próximos {DAYS_AHEAD} dias
          </h2>
          <p className="text-sm text-muted">
            Horário de Brasília ({APP_TIMEZONE}). O que não está listado está
            livre.
          </p>
        </div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {schedule.map((day) => (
            <li key={day.key} className="flex flex-col gap-1 p-4 sm:flex-row">
              <span className="w-56 shrink-0 text-sm font-medium first-letter:uppercase text-brand-900">
                {day.label}
              </span>
              {day.busy.length === 0 ? (
                <span className="text-sm text-green-800">Livre o dia todo</span>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {day.busy.map((slot, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-red-50 px-2 py-1 text-sm text-red-800"
                    >
                      {slot.start} às {slot.end}
                      {slot.endsNextDay ? " (dia seguinte)" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {room.active ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold text-brand-900">Reservar</h2>
            <p className="text-sm text-muted">
              Horário de Brasília. Início de 15 em 15 minutos, duração de 15
              minutos a 4 horas, com até {MAX_ADVANCE_DAYS} dias de
              antecedência.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <ReservationForm
              roomId={room.id}
              minDate={dayKey(now)}
              maxDate={dayKey(
                new Date(now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000),
              )}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-8 w-64 animate-pulse rounded bg-line" />
      <div className="h-24 animate-pulse rounded-2xl bg-line" />
      <div className="h-56 animate-pulse rounded-2xl bg-line" />
    </div>
  );
}

