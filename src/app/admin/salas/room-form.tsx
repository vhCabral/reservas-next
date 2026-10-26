"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createRoomAction } from "@/app/actions/rooms";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";

export function RoomForm() {
  const [state, formAction] = useActionState(createRoomAction, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state?.message} />
      <Field
        label="Nome"
        name="name"
        required
        maxLength={120}
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
      <Field
        label="Capacidade (lugares)"
        name="capacity"
        type="number"
        inputMode="numeric"
        min={1}
        max={10000}
        required
        defaultValue={state?.values?.capacity}
        error={state?.fieldErrors?.capacity}
      />
      <Field
        label="Local (opcional)"
        name="location"
        maxLength={120}
        defaultValue={state?.values?.location}
        error={state?.fieldErrors?.location}
      />
      <TextareaField
        label="Descrição (opcional)"
        name="description"
        rows={4}
        maxLength={500}
        defaultValue={state?.values?.description}
        error={state?.fieldErrors?.description}
      />
      <div className="flex items-center gap-4">
        <div className="w-40">
          <SubmitButton pendingText="Salvando…">Criar sala</SubmitButton>
        </div>
        <Link
          href="/admin/salas"
          className="text-sm text-accent-600 hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
