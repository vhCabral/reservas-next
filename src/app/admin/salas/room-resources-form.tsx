"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { noteKey, quantityKey } from "./resources-form";

export type ResourceRowInitial = {
  id: string;
  name: string;
  description: string;
  checked: boolean;
  quantity: string;
  note: string;
};

type RowState = { checked: boolean; quantity: string; note: string };

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:bg-slate-50 disabled:text-muted";

// Os campos são "controlados" (guardados em estado): depois de salvar, o React
// limpa formulários não controlados, e a pessoa perderia o que digitou se
// houvesse um erro. Assim o que está na tela nunca some sozinho.
export function RoomResourcesForm({
  action,
  resources,
}: {
  action: (
    prev: FormState | undefined,
    formData: FormData,
  ) => Promise<FormState>;
  resources: ResourceRowInitial[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  // O React 19 limpa o formulário depois de cada envio. Campos de texto
  // sobrevivem, mas a caixinha de marcar volta ao valor de quando a página
  // abriu e sai de sincronia com o estado. Por isso a lista é recriada (nova
  // "key") a cada resposta do servidor: as caixinhas nascem já corretas.
  const [seenState, setSeenState] = useState(state);
  const [version, setVersion] = useState(0);
  if (state !== seenState) {
    setSeenState(state);
    setVersion((v) => v + 1);
  }
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      resources.map((r) => [
        r.id,
        { checked: r.checked, quantity: r.quantity, note: r.note },
      ]),
    ),
  );
  const patch = (id: string, change: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));

  if (resources.length === 0) {
    return (
      <p className="text-sm text-muted">
        Ainda não há recursos ativos no catálogo.{" "}
        <Link
          href="/admin/recursos/novo"
          className="text-accent-600 hover:underline"
        >
          Cadastrar um recurso
        </Link>
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.ok ? (
        <FormSuccess message={state.message ?? "Salvo."} />
      ) : (
        <FormError message={state?.message} />
      )}

      <ul key={version} className="space-y-3">
        {resources.map((resource) => {
          const row = rows[resource.id];
          const quantityError = state?.fieldErrors?.[quantityKey(resource.id)];
          const noteError = state?.fieldErrors?.[noteKey(resource.id)];
          return (
            <li
              key={resource.id}
              className="space-y-3 rounded-xl border border-line p-4"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="resourceId"
                  value={resource.id}
                  checked={row.checked}
                  onChange={(event) =>
                    patch(resource.id, { checked: event.target.checked })
                  }
                  className="mt-1 h-4 w-4 accent-accent-600"
                />
                <span>
                  <span className="block font-medium text-brand-900">
                    {resource.name}
                  </span>
                  {resource.description ? (
                    <span className="block text-sm text-muted">
                      {resource.description}
                    </span>
                  ) : null}
                </span>
              </label>

              {row.checked ? (
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <div className="space-y-1">
                    <label
                      htmlFor={`qty-${resource.id}`}
                      className="text-sm font-medium text-ink"
                    >
                      Quantidade
                    </label>
                    <input
                      id={`qty-${resource.id}`}
                      name={quantityKey(resource.id)}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      value={row.quantity}
                      onChange={(event) =>
                        patch(resource.id, { quantity: event.target.value })
                      }
                      aria-invalid={quantityError ? true : undefined}
                      aria-describedby={
                        quantityError ? `qty-err-${resource.id}` : undefined
                      }
                      className={inputClass}
                    />
                    {quantityError ? (
                      <p
                        id={`qty-err-${resource.id}`}
                        className="text-sm text-red-700"
                      >
                        {quantityError}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`note-${resource.id}`}
                      className="text-sm font-medium text-ink"
                    >
                      Observação (opcional)
                    </label>
                    <input
                      id={`note-${resource.id}`}
                      name={noteKey(resource.id)}
                      type="text"
                      maxLength={200}
                      placeholder="Ex.: modelo Epson EB-X06"
                      value={row.note}
                      onChange={(event) =>
                        patch(resource.id, { note: event.target.value })
                      }
                      aria-invalid={noteError ? true : undefined}
                      aria-describedby={
                        noteError ? `note-err-${resource.id}` : undefined
                      }
                      className={inputClass}
                    />
                    {noteError ? (
                      <p
                        id={`note-err-${resource.id}`}
                        className="text-sm text-red-700"
                      >
                        {noteError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="w-44">
        <SubmitButton pendingText="Salvando…">Salvar recursos</SubmitButton>
      </div>
    </form>
  );
}
