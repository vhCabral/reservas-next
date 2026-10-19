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

export const listReservationsQuerySchema = z.object({
  scope: z.enum(["mine", "all"]).default("mine"),
});

const MAX_AVAILABILITY_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

export const availabilityQuerySchema = z
  .object({ from: instant, to: instant })
  .refine(({ from, to }) => to > from, { message: "'to' must be after 'from'" })
  .refine(
    ({ from, to }) =>
      to.getTime() - from.getTime() <= MAX_AVAILABILITY_RANGE_MS,
    {
      message: "Range must be at most 31 days",
    },
  );
