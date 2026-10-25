import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string;
};

// Campo com rótulo associado (acessibilidade) e erro anunciado por leitor de tela.
export function Field({ label, error, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const errorId = `${inputId}-erro`;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-brand-900 shadow-sm focus-visible:outline-2 focus-visible:outline-accent-600 aria-[invalid=true]:border-red-500"
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
