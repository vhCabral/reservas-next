import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Cadastro" };

export default function CadastroPage() {
  return (
    <Card title="Criar conta">
      <RegisterForm />
      <p className="mt-4 text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent-600 hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
