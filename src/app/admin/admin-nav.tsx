import Link from "next/link";

const ITEMS = [
  { key: "salas", href: "/admin/salas", label: "Salas" },
  { key: "recursos", href: "/admin/recursos", label: "Recursos" },
  { key: "reservas", href: "/admin/reservas", label: "Reservas" },
] as const;

// Navegação entre as áreas de administração. É só conveniência: quem protege
// cada área é a própria página (requireAdminOrNotFound) e as Actions.
export function AdminNav({
  current,
}: {
  current: "salas" | "recursos" | "reservas";
}) {
  return (
    <nav aria-label="Administração" className="flex gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent-600 ${
            item.key === current
              ? "bg-brand-900 text-white"
              : "border border-line text-ink hover:bg-accent-50"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
