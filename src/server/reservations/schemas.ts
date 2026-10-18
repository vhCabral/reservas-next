import { z } from "zod";

// Exige fuso explícito (Z ou ±hh:mm) e já converte para Date.
const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const reservationIdSchema = z.uuid();

export const createReservationSchema = z.strictObject({
  roomId: z.uuid(),
  startAt: instant,
  endAt: instant,
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
