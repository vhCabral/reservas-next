import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
};

// Mesmo padrão do Field: rótulo associado e erro anunciado por leitor de tela.
export function SelectField({
  label,
  error,
  id,
  children,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? props.name;
  const errorId = `${selectId}-erro`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-brand-900 shadow-sm focus-visible:outline-2 focus-visible:outline-accent-600 aria-[invalid=true]:border-red-500"
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
