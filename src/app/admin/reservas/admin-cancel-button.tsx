"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

// Cancelar a reserva de OUTRA pessoa pede uma confirmação em dois passos.
// A Action já vem com o id da reserva embutido (bind) pela página.
export function AdminCancelButton({
  action,
}: {
  action: (
    prev: FormState | undefined,
    formData: FormData,
  ) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [confirming, setConfirming] = useState(false);

  if (state?.ok) {
    return (
      <p role="status" className="text-sm text-green-800">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state?.message} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink">
            Cancelar esta reserva? O horário volta a ficar livre.
          </p>
          <div className="w-44">
            <SubmitButton pendingText="Cancelando…">Sim, cancelar</SubmitButton>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm text-accent-600 hover:underline"
          >
            Voltar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-600"
        >
          Cancelar reserva
        </button>
      )}
    </form>
  );
}
