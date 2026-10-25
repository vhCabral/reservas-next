"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state?.message} />
      <Field
        label="Nome"
        name="name"
        autoComplete="name"
        required
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.password}
      />
      <SubmitButton pendingText="Criando conta…">Criar conta</SubmitButton>
    </form>
  );
}
