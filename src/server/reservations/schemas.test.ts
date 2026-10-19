import { describe, it, expect } from "vitest";
import { availabilityQuerySchema, createReservationSchema } from "./schemas";

const roomId = "00000000-0000-4000-8000-000000000001";

describe("createReservationSchema", () => {
  it("aceita datas com fuso e converte para Date", () => {
    const r = createReservationSchema.parse({
      roomId,
      startAt: "2026-10-20T14:00:00-03:00",
      endAt: "2026-10-20T15:00:00Z",
    });
    expect(r.startAt.toISOString()).toBe("2026-10-20T17:00:00.000Z");
  });
  it("rejeita data sem fuso (ambígua)", () => {
    expect(
      createReservationSchema.safeParse({
        roomId,
        startAt: "2026-10-20T14:00:00",
        endAt: "2026-10-20T15:00:00Z",
      }).success,
    ).toBe(false);
  });
  it("rejeita userId e status no corpo (mass assignment)", () => {
    const base = {
      roomId,
      startAt: "2026-10-20T14:00:00Z",
      endAt: "2026-10-20T15:00:00Z",
    };
    expect(
      createReservationSchema.safeParse({ ...base, userId: roomId }).success,
    ).toBe(false);
    expect(
      createReservationSchema.safeParse({ ...base, status: "CANCELLED" })
        .success,
    ).toBe(false);
  });
});

describe("availabilityQuerySchema", () => {
  it("valida ordem e limite de 31 dias", () => {
    expect(
      availabilityQuerySchema.safeParse({
        from: "2026-10-20T00:00:00Z",
        to: "2026-10-21T00:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      availabilityQuerySchema.safeParse({
        from: "2026-10-21T00:00:00Z",
        to: "2026-10-20T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      availabilityQuerySchema.safeParse({
        from: "2026-10-01T00:00:00Z",
        to: "2026-11-05T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});
