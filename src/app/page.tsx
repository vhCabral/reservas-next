import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-900">
        Reservas de Salas e Auditórios
      </h1>
      <p className="text-muted">
        Veja as salas, confira os horários livres e reserve sem conflito.
      </p>
      <Link
        href="/salas"
        className="inline-block rounded-full bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        Ver salas
      </Link>
    </div>
  );
}
