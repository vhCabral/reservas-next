import type { ReactNode } from "react";

export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold text-brand-900">{title}</h1>
      {children}
    </section>
  );
}
