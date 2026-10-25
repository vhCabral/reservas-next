import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/form-message";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-4">
      <Card title="Entrar">
        <Suspense fallback={null}>
          <CadastroOk searchParams={searchParams} />
        </Suspense>
        <LoginForm />
        <p className="mt-4 text-sm text-muted">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-accent-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </Card>
    </div>
  );
}

// Ler searchParams é dado de requisição: precisa de <Suspense> no Cache
// Components, então isolamos num componente pequeno e o envolvemos abaixo.
async function CadastroOk({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  if (params.cadastro !== "ok") return null;
  return (
    <div className="mb-4">
      <FormSuccess message="Conta criada! Entre com seu e-mail e senha." />
    </div>
  );
}
