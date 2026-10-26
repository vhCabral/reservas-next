"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelReservationAction } from "@/app/actions/reservations";
import { FormError } from "@/components/ui/form-message";

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Sim, cancelar"}
    </button>
  );
}

// Dois passos de propósito: cancelar não tem desfazer. Só recebe o id da
// reserva; quem decide se pode cancelar é a Action (e o serviço).
export function CancelButton({ reservationId }: { reservationId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(
    cancelReservationAction.bind(null, reservationId),
    undefined,
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        Cancelar reserva
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state?.message} />
      <p className="text-sm text-ink">
        Cancelar esta reserva? O horário volta a ficar livre para outras pessoas.
      </p>
      <div className="flex gap-2">
        <ConfirmSubmit />
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
