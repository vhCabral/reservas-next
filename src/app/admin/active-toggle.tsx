"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/form-state";
import { FormError } from "@/components/ui/form-message";

function ConfirmSubmit({
  danger,
  label,
  pendingLabel,
}: {
  danger: boolean;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-full px-4 py-1.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700"
          : "bg-brand-900 hover:bg-brand-800 focus-visible:outline-accent-600"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// Botão de ativar/desativar reaproveitado por salas e recursos. A página passa
// a Action já pronta (com o id e o novo valor de "active" presos por bind()).
// Desativar pede confirmação; reativar é direto. A página usa key={active}: ao
// mudar a situação, o componente recomeça limpo.
export function ActiveToggle({
  active,
  action,
  noun,
  deactivateWarning,
}: {
  active: boolean;
  action: (
    prev: FormState | undefined,
    formData: FormData,
  ) => Promise<FormState>;
  noun: string; // "sala" ou "recurso"
  deactivateWarning: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(action, undefined);

  if (!active) {
    return (
      <form action={formAction} className="space-y-2">
        <FormError message={state?.message} />
        <ConfirmSubmit
          danger={false}
          label={`Reativar ${noun}`}
          pendingLabel="Reativando…"
        />
      </form>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        {`Desativar ${noun}`}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state?.message} />
      <p className="max-w-md text-sm text-ink">{deactivateWarning}</p>
      <div className="flex gap-2">
        <ConfirmSubmit
          danger
          label="Sim, desativar"
          pendingLabel="Desativando…"
        />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-600"
        >
          Voltar
        </button>
      </div>
    </form>
  );
}
