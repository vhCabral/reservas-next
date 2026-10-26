"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { Field } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";

type RoomFormInitial = {
  name: string;
  capacity: string;
  location: string;
  description: string;
};

// Serve para criar e para editar: a página escolhe a Action e os valores iniciais.
export function RoomForm({
  action,
  initial,
  submitLabel,
  pendingText,
}: {
  action: (
    prev: FormState | undefined,
    formData: FormData,
  ) => Promise<FormState>;
  initial?: RoomFormInitial;
  submitLabel: string;
  pendingText: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  // O que a pessoa acabou de enviar tem prioridade sobre o valor inicial.
  const value = (key: keyof RoomFormInitial) =>
    state?.values?.[key] ?? initial?.[key];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.ok ? (
        <FormSuccess message={state.message ?? "Salvo."} />
      ) : (
        <FormError message={state?.message} />
      )}
      <Field
        label="Nome"
        name="name"
        required
        maxLength={120}
        defaultValue={value("name")}
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
        defaultValue={value("capacity")}
        error={state?.fieldErrors?.capacity}
      />
      <Field
        label="Local (opcional)"
        name="location"
        maxLength={120}
        defaultValue={value("location")}
        error={state?.fieldErrors?.location}
      />
      <TextareaField
        label="Descrição (opcional)"
        name="description"
        rows={4}
        maxLength={500}
        defaultValue={value("description")}
        error={state?.fieldErrors?.description}
      />
      <div className="flex items-center gap-4">
        <div className="w-44">
          <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
        </div>
        <Link
          href="/admin/salas"
          className="text-sm text-accent-600 hover:underline"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
