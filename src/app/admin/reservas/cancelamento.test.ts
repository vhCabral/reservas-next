import { describe, expect, it } from "vitest";
import { adminCanCancel } from "./cancelamento";

const now = new Date("2026-11-01T12:00:00Z");
const at = (iso: string) => new Date(iso);

describe("adminCanCancel", () => {
  it("reserva futura confirmada pode ser cancelada", () => {
    expect(
      adminCanCancel({ status: "CONFIRMED", endAt: at("2026-11-02T10:00:00Z") }, now),
    ).toBe(true);
  });

  it("reserva em andamento pode ser cancelada", () => {
    expect(
      adminCanCancel({ status: "CONFIRMED", endAt: at("2026-11-01T12:30:00Z") }, now),
    ).toBe(true);
  });

  it("reserva que já terminou não mostra o botão (inclusive no instante exato)", () => {
    expect(
      adminCanCancel({ status: "CONFIRMED", endAt: at("2026-11-01T11:59:59Z") }, now),
    ).toBe(false);
    expect(
      adminCanCancel({ status: "CONFIRMED", endAt: at("2026-11-01T12:00:00Z") }, now),
    ).toBe(false);
  });

  it("reserva já cancelada não mostra o botão", () => {
    expect(
      adminCanCancel({ status: "CANCELLED", endAt: at("2026-11-02T10:00:00Z") }, now),
    ).toBe(false);
  });
});
