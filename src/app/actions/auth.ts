"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, registerUser } from "@/server/auth/auth.service";
import {
  enforceLoginRateLimit,
  resetLoginPairLimit,
} from "@/server/auth/login-rate-limit";
import { loginSchema, registerSchema } from "@/server/auth/schemas";
import { endSession, startSession } from "@/server/auth/session-cookie";
import {
  ConflictError,
  TooManyRequestsError,
  UnauthorizedError,
} from "@/server/http/errors";
import { getClientIpFromHeaders } from "@/server/http/client-ip";
import type { FormState } from "./form-state";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Mensagem genérica por campo: não repassamos texto técnico da validação.
function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(z.flattenError(error).fieldErrors)) {
    result[key] = "Valor inválido. Confira este campo.";
  }
  return result;
}

export async function loginAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const email = text(formData, "email");
  const parsed = loginSchema.safeParse({
    email,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      message: "Informe um e-mail e uma senha válidos.",
      fieldErrors: fieldErrorsOf(parsed.error),
      values: { email },
    };
  }

  const ip = getClientIpFromHeaders(await headers());

  try {
    // Mesma ordem da rota /api/auth/login: limite ANTES do Argon2.
    await enforceLoginRateLimit(ip, parsed.data.email);
    const user = await authenticate(parsed.data);
    await resetLoginPairLimit(ip, parsed.data.email);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return {
        message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
        values: { email },
      };
    }
    if (error instanceof UnauthorizedError) {
      // Uma mensagem única: não revela se o e-mail existe.
      return { message: "E-mail ou senha incorretos.", values: { email } };
    }
    throw error;
  }

  redirect("/"); // fora do try: redirect() funciona lançando uma exceção
}

export async function registerAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const parsed = registerSchema.safeParse({
    name,
    email,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: fieldErrorsOf(parsed.error),
      values: { name, email },
    };
  }

  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        fieldErrors: { email: "Este e-mail já está cadastrado." },
        values: { name, email },
      };
    }
    throw error;
  }

  redirect("/login?cadastro=ok");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
