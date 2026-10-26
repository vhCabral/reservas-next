"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserOrLogin } from "@/server/auth/current-user";
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/server/http/errors";
import {
  cancelReservation,
  createReservation,
} from "@/server/reservations/reservations.service";
import { reservationIdSchema } from "@/server/reservations/schemas";
import { roomIdSchema } from "@/server/rooms/schemas";
import {
  buildWindow,
  describeWindow,
  DURATION_OPTIONS_MIN,
} from "@/app/salas/horarios";
import {
  FALLBACK_POLICY_MESSAGE,
  translatePolicyProblem,
} from "@/app/salas/mensagens";
import type { FormState } from "./form-state";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Só o formato aqui; as regras de negócio (futuro, 15 min, 90 dias...) são do
// serviço, que é quem decide. O banco ainda garante que não haja conflito.
const formSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário."),
  duration: z
    .string()
    .regex(/^\d{2,3}$/)
    .transform(Number)
    .refine((n) => DURATION_OPTIONS_MIN.includes(n), "Escolha a duração."),
});

// Atualiza as telas que mostram reservas (agenda da sala e "Minhas reservas").
function revalidateReservationViews() {
  revalidatePath("/salas/[id]", "page");
  revalidatePath("/minhas-reservas");
}

/**
 * Cria uma reserva. O roomId chega por bind() e a pessoa pode alterá-lo, então
 * é tratado como entrada não confiável (validado e conferido pelo serviço). O
 * usuário NUNCA vem do formulário: sai da sessão, dentro do serviço.
 */
export async function createReservationAction(
  roomId: string,
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUserOrLogin();

  const values = {
    date: text(formData, "date"),
    time: text(formData, "time"),
    duration: text(formData, "duration"),
  };

  const room = roomIdSchema.safeParse(roomId);
  if (!room.success) {
    return { message: "Sala inválida.", values };
  }

  const parsed = formSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { message: "Revise os campos destacados.", fieldErrors, values };
  }

  const window = buildWindow(
    parsed.data.date,
    parsed.data.time,
    parsed.data.duration,
  );
  if (!window) {
    return {
      message: "Revise os campos destacados.",
      fieldErrors: { date: "Essa data não existe." },
      values,
    };
  }

  try {
    await createReservation(actor, { roomId: room.data, ...window });
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        message:
          "Esse horário já está reservado. Veja os horários ocupados acima e escolha outro.",
        values,
      };
    }
    if (error instanceof NotFoundError) {
      return { message: "Essa sala não está disponível para reserva.", values };
    }
    if (error instanceof UnprocessableEntityError) {
      return {
        message:
          translatePolicyProblem(error.message) || FALLBACK_POLICY_MESSAGE,
        values,
      };
    }
    throw error;
  }

  revalidateReservationViews();
  return {
    ok: true,
    message: `Reserva confirmada: ${describeWindow(window.startAt, window.endAt)}.`,
  };
}

/**
 * Cancela uma reserva. O id chega por bind() e pode ser adulterado: o serviço
 * confere que a reserva é de quem está logado (ou que é ADMIN). Reserva alheia
 * e reserva inexistente dão o MESMO erro (anti-IDOR).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- assinatura exigida pelo useActionState (estado, formulário) */
export async function cancelReservationAction(
  reservationId: string,
  _prev: FormState | undefined,
  _formData: FormData,
): Promise<FormState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const actor = await requireUserOrLogin();

  const id = reservationIdSchema.safeParse(reservationId);
  if (!id.success) {
    return { message: "Reserva não encontrada." };
  }

  try {
    await cancelReservation(actor, id.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { message: "Reserva não encontrada." };
    }
    if (error instanceof UnprocessableEntityError) {
      return {
        message: "Essa reserva já começou e não pode mais ser cancelada.",
      };
    }
    throw error;
  }

  revalidateReservationViews();
  return { ok: true, message: "Reserva cancelada." };
}
