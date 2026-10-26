"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseRoomForm } from "@/app/admin/salas/form";
import { assertAdmin } from "@/server/auth/authorization";
import { requireUserOrLogin } from "@/server/auth/current-user";
import { ForbiddenError } from "@/server/http/errors";
import { createRoom } from "@/server/rooms/rooms.service";
import type { FormState } from "./form-state";

const NOT_ALLOWED = "Você não tem permissão para esta ação.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Cria uma sala. Uma Server Action é um endpoint POST que qualquer pessoa pode
 * chamar na mão, então a checagem de admin acontece AQUI, antes de tudo, e de
 * novo dentro do serviço (createRoom). Esconder o botão não protege nada.
 */
export async function createRoomAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();

  const values = {
    name: text(formData, "name"),
    capacity: text(formData, "capacity"),
    location: text(formData, "location"),
    description: text(formData, "description"),
  };

  try {
    assertAdmin(actor);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { message: NOT_ALLOWED, values };
    }
    throw error;
  }

  const parsed = parseRoomForm(values);
  if (!parsed.ok) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: parsed.fieldErrors,
      values,
    };
  }

  try {
    await createRoom(actor, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { message: NOT_ALLOWED, values };
    }
    throw error;
  }

  revalidatePath("/admin/salas");
  revalidatePath("/salas");
  // redirect() lança uma exceção de propósito: por isso fica fora do try.
  redirect("/admin/salas");
}
