import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-8 text-center">
      <h1 className="text-2xl font-semibold text-brand-900">
        Página não encontrada
      </h1>
      <p className="text-muted">
        O endereço não existe ou você não tem acesso a ele.
      </p>
      <Link href="/" className="text-accent-600 hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
