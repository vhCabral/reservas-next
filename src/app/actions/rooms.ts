"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseRoomForm } from "@/app/admin/salas/form";
import { assertAdmin } from "@/server/auth/authorization";
import { requireUserOrLogin } from "@/server/auth/current-user";
import type { PublicUser } from "@/server/auth/users.repository";
import { ForbiddenError, NotFoundError } from "@/server/http/errors";
import { createRoom, updateRoom } from "@/server/rooms/rooms.service";
import { roomIdSchema, updateRoomSchema } from "@/server/rooms/schemas";
import type { FormState } from "./form-state";

const NOT_ALLOWED = "Você não tem permissão para esta ação.";
const ROOM_NOT_FOUND = "Sala não encontrada.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readRoomForm(formData: FormData) {
  return {
    name: text(formData, "name"),
    capacity: text(formData, "capacity"),
    location: text(formData, "location"),
    description: text(formData, "description"),
  };
}

// Devolve a mensagem de erro se NÃO for admin; null se for. Uma Server Action é
// um endpoint POST que qualquer pessoa pode chamar na mão: esta checagem vem
// ANTES de tudo, e o serviço confere de novo (defesa em duas camadas).
function adminProblem(actor: PublicUser): string | null {
  try {
    assertAdmin(actor);
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return NOT_ALLOWED;
    throw error;
  }
}

// Telas que mostram dados de sala: admin (lista e edição) e públicas.
function revalidateRoomViews() {
  revalidatePath("/admin/salas");
  revalidatePath("/admin/salas/[id]", "page");
  revalidatePath("/salas");
  revalidatePath("/salas/[id]", "page");
}

export async function createRoomAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();
  const values = readRoomForm(formData);

  const denied = adminProblem(actor);
  if (denied) return { message: denied, values };

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

  revalidateRoomViews();
  // redirect() lança uma exceção de propósito: por isso fica fora do try.
  redirect("/admin/salas");
}

/**
 * Edita nome, capacidade, local e descrição. O roomId chega por bind() e pode
 * ser adulterado: é validado e o serviço decide (sala inexistente = erro).
 */
export async function updateRoomAction(
  roomId: string,
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();
  const values = readRoomForm(formData);

  const denied = adminProblem(actor);
  if (denied) return { message: denied, values };

  const id = roomIdSchema.safeParse(roomId);
  if (!id.success) return { message: ROOM_NOT_FOUND, values };

  const parsed = parseRoomForm(values);
  if (!parsed.ok) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: parsed.fieldErrors,
      values,
    };
  }

  try {
    await updateRoom(actor, id.data, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { message: NOT_ALLOWED, values };
    }
    if (error instanceof NotFoundError) {
      return { message: ROOM_NOT_FOUND, values };
    }
    throw error;
  }

  revalidateRoomViews();
  return {
    ok: true,
    message: "Alterações salvas.",
    // Mostra no formulário o que foi realmente gravado (já sem espaços sobrando).
    values: {
      name: parsed.data.name,
      capacity: String(parsed.data.capacity),
      location: parsed.data.location ?? "",
      description: parsed.data.description ?? "",
    },
  };
}

/**
 * Ativa ou desativa uma sala. Sala inativa some para usuários comuns e não
 * aceita novas reservas; as reservas já feitas continuam existindo. Os dois
 * argumentos vindos de bind() são tratados como entrada não confiável.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- assinatura exigida pelo useActionState (estado, formulário) */
export async function setRoomActiveAction(
  roomId: string,
  active: boolean,
  _prev: FormState | undefined,
  _formData: FormData,
): Promise<FormState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const actor = await requireUserOrLogin();

  const denied = adminProblem(actor);
  if (denied) return { message: denied };

  const id = roomIdSchema.safeParse(roomId);
  if (!id.success) return { message: ROOM_NOT_FOUND };

  // Mesma regra do schema da API: só um booleano é aceito.
  const input = updateRoomSchema.safeParse({ active });
  if (!input.success) return { message: "Pedido inválido." };

  try {
    await updateRoom(actor, id.data, input.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { message: NOT_ALLOWED };
    if (error instanceof NotFoundError) return { message: ROOM_NOT_FOUND };
    throw error;
  }

  revalidateRoomViews();
  return {
    ok: true,
    message: input.data.active ? "Sala reativada." : "Sala desativada.",
  };
}
