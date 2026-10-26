import type { TextareaHTMLAttributes } from "react";

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  label: string;
  error?: string;
};

// Mesmo padrão do Field: rótulo associado e erro anunciado por leitor de tela.
export function TextareaField({
  label,
  error,
  id,
  ...props
}: TextareaFieldProps) {
  const textareaId = id ?? props.name;
  const errorId = `${textareaId}-erro`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={textareaId}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
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
