"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Botão de envio: desabilita enquanto a Action roda (evita duplo clique).
export function SubmitButton({
  children,
  pendingText = "Enviando…",
}: {
  children: ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
