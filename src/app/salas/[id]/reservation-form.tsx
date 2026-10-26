"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createReservationAction } from "@/app/actions/reservations";
import { Field } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DURATION_OPTIONS_MIN, formatDuration } from "../horarios";

export function ReservationForm({
  roomId,
  minDate,
  maxDate,
}: {
  roomId: string;
  minDate: string;
  maxDate: string;
}) {
  const [state, formAction] = useActionState(
    createReservationAction.bind(null, roomId),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.ok ? (
        <div className="space-y-2">
          <FormSuccess message={state.message ?? "Reserva confirmada."} />
          <Link
            href="/minhas-reservas"
            className="text-sm text-accent-600 hover:underline"
          >
            Ver minhas reservas
          </Link>
        </div>
      ) : (
        <FormError message={state?.message} />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Data"
          name="date"
          type="date"
          required
          min={minDate}
          max={maxDate}
          defaultValue={state?.values?.date}
          error={state?.fieldErrors?.date}
        />
        <Field
          label="Início"
          name="time"
          type="time"
          step={900}
          required
          defaultValue={state?.values?.time}
          error={state?.fieldErrors?.time}
        />
        <SelectField
          label="Duração"
          name="duration"
          required
          defaultValue={state?.values?.duration ?? "60"}
          error={state?.fieldErrors?.duration}
        >
          {DURATION_OPTIONS_MIN.map((m) => (
            <option key={m} value={m}>
              {formatDuration(m)}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="max-w-xs">
        <SubmitButton pendingText="Reservando…">Reservar</SubmitButton>
      </div>
    </form>
  );
}
