"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseRoomForm } from "@/app/admin/salas/form";
import {
  parseRoomResourcesForm,
  type RoomResourceRow,
} from "@/app/admin/salas/resources-form";
import { requireUserOrLogin } from "@/server/auth/current-user";
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/server/http/errors";
import { setRoomResources } from "@/server/rooms/room-resources.service";
import { createRoom, updateRoom } from "@/server/rooms/rooms.service";
import { roomIdSchema, updateRoomSchema } from "@/server/rooms/schemas";
import type { FormState } from "./form-state";
import { adminProblem, formText, NOT_ALLOWED } from "./guard";

const ROOM_NOT_FOUND = "Sala não encontrada.";

function readRoomForm(formData: FormData) {
  return {
    name: formText(formData, "name"),
    capacity: formText(formData, "capacity"),
    location: formText(formData, "location"),
    description: formText(formData, "description"),
  };
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
 * Substitui os recursos da sala (marcados no formulário, com quantidade e
 * observação). O roomId vem por bind() e os campos vêm do formulário: tudo é
 * entrada não confiável. Quem não é admin é barrado ANTES de qualquer leitura
 * dos campos, e o serviço confere de novo.
 */
export async function setRoomResourcesAction(
  roomId: string,
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();

  const denied = adminProblem(actor);
  if (denied) return { message: denied };

  const id = roomIdSchema.safeParse(roomId);
  if (!id.success) return { message: ROOM_NOT_FOUND };

  // Só os recursos marcados são enviados ("resourceId" repetido, um por marca).
  // Os campos de quantidade e observação são procurados pelo id de cada um.
  const rows: RoomResourceRow[] = formData
    .getAll("resourceId")
    .filter((value): value is string => typeof value === "string")
    .map((resourceId) => ({
      resourceId,
      quantity: formText(formData, `quantity-${resourceId}`),
      note: formText(formData, `note-${resourceId}`),
    }));

  const parsed = parseRoomResourcesForm(rows);
  if (!parsed.ok) {
    return { message: parsed.message, fieldErrors: parsed.fieldErrors };
  }

  try {
    await setRoomResources(actor, id.data, parsed.data.items);
  } catch (error) {
    if (error instanceof ForbiddenError) return { message: NOT_ALLOWED };
    if (error instanceof NotFoundError) return { message: ROOM_NOT_FOUND };
    if (error instanceof UnprocessableEntityError) {
      return {
        message:
          "Algum recurso não existe mais ou foi desativado. Recarregue a página e tente de novo.",
      };
    }
    throw error;
  }

  revalidateRoomViews();
  return { ok: true, message: "Recursos da sala salvos." };
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
