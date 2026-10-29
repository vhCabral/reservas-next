"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseResourceForm } from "@/app/admin/recursos/form";
import { requireUserOrLogin } from "@/server/auth/current-user";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/http/errors";
import {
  createResource,
  updateResource,
} from "@/server/resources/resources.service";
import {
  resourceIdSchema,
  updateResourceSchema,
} from "@/server/resources/schemas";
import type { FormState } from "./form-state";
import { adminProblem, formText, NOT_ALLOWED } from "./guard";

const RESOURCE_NOT_FOUND = "Recurso não encontrado.";
const DUPLICATE_NAME = "Já existe um recurso com esse nome.";

function readResourceForm(formData: FormData) {
  return {
    name: formText(formData, "name"),
    description: formText(formData, "description"),
  };
}

// Telas que mostram recursos: lista/edição de admin e a página da sala.
function revalidateResourceViews() {
  revalidatePath("/admin/recursos");
  revalidatePath("/admin/recursos/[id]", "page");
  revalidatePath("/admin/salas/[id]", "page");
  revalidatePath("/salas/[id]", "page");
}

/**
 * Cria um recurso. A checagem de admin vem ANTES de tudo (e o serviço confere
 * de novo): esconder o botão não protege uma Server Action.
 */
export async function createResourceAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();
  const values = readResourceForm(formData);

  const denied = adminProblem(actor);
  if (denied) return { message: denied, values };

  const parsed = parseResourceForm(values);
  if (!parsed.ok) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: parsed.fieldErrors,
      values,
    };
  }

  try {
    await createResource(actor, parsed.data);
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        message: "Revise os campos destacados.",
        fieldErrors: { name: DUPLICATE_NAME },
        values,
      };
    }
    if (error instanceof ForbiddenError) {
      return { message: NOT_ALLOWED, values };
    }
    throw error;
  }

  revalidateResourceViews();
  // redirect() lança uma exceção de propósito: por isso fica fora do try.
  redirect("/admin/recursos");
}

/** Edita nome e descrição. O resourceId vem por bind(): entrada não confiável. */
export async function updateResourceAction(
  resourceId: string,
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();
  const values = readResourceForm(formData);

  const denied = adminProblem(actor);
  if (denied) return { message: denied, values };

  const id = resourceIdSchema.safeParse(resourceId);
  if (!id.success) return { message: RESOURCE_NOT_FOUND, values };

  const parsed = parseResourceForm(values);
  if (!parsed.ok) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: parsed.fieldErrors,
      values,
    };
  }

  try {
    await updateResource(actor, id.data, parsed.data);
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        message: "Revise os campos destacados.",
        fieldErrors: { name: DUPLICATE_NAME },
        values,
      };
    }
    if (error instanceof ForbiddenError) {
      return { message: NOT_ALLOWED, values };
    }
    if (error instanceof NotFoundError) {
      return { message: RESOURCE_NOT_FOUND, values };
    }
    throw error;
  }

  revalidateResourceViews();
  return {
    ok: true,
    message: "Alterações salvas.",
    // Mostra no formulário o que foi realmente gravado (sem espaços sobrando).
    values: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
    },
  };
}

/**
 * Ativa ou desativa um recurso. Recurso inativo deixa de aparecer nas salas
 * para usuários comuns e não pode ser adicionado a salas. Os dois argumentos
 * vindos de bind() são tratados como entrada não confiável.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- assinatura exigida pelo useActionState (estado, formulário) */
export async function setResourceActiveAction(
  resourceId: string,
  active: boolean,
  _prev: FormState | undefined,
  _formData: FormData,
): Promise<FormState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const actor = await requireUserOrLogin();

  const denied = adminProblem(actor);
  if (denied) return { message: denied };

  const id = resourceIdSchema.safeParse(resourceId);
  if (!id.success) return { message: RESOURCE_NOT_FOUND };

  // Mesma regra do schema da API: só um booleano é aceito.
  const input = updateResourceSchema.safeParse({ active });
  if (!input.success) return { message: "Pedido inválido." };

  try {
    await updateResource(actor, id.data, input.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { message: NOT_ALLOWED };
    if (error instanceof NotFoundError) return { message: RESOURCE_NOT_FOUND };
    throw error;
  }

  revalidateResourceViews();
  return {
    ok: true,
    message: input.data.active ? "Recurso reativado." : "Recurso desativado.",
  };
}
