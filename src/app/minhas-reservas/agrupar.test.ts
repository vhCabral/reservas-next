import { describe, expect, it } from "vitest";
import {
  canCancel,
  splitReservations,
  statusInfo,
  type ReservationLike,
} from "./agrupar";

const now = new Date("2026-10-25T15:00:00Z");
const H = 3_600_000;
const at = (hours: number) => new Date(now.getTime() + hours * H);

const make = (
  id: string,
  startH: number,
  endH: number,
  status: ReservationLike["status"] = "CONFIRMED",
): ReservationLike => ({ id, startAt: at(startH), endAt: at(endH), status });

describe("splitReservations", () => {
  it("separa próximas e histórico, e ordena cada grupo", () => {
    const { upcoming, history } = splitReservations(
      [
        make("depois", 48, 49),
        make("passada", -5, -4),
        make("cancelada", 10, 11, "CANCELLED"),
        make("amanha", 24, 25),
        make("passada-antiga", -50, -49),
      ],
      now,
    );
    expect(upcoming.map((r) => r.id)).toEqual(["amanha", "depois"]);
    expect(history.map((r) => r.id)).toEqual([
      "cancelada",
      "passada",
      "passada-antiga",
    ]);
  });

  it("reserva em andamento ainda é 'próxima'", () => {
    const { upcoming } = splitReservations([make("agora", -1, 1)], now);
    expect(upcoming).toHaveLength(1);
  });

  it("reserva que termina exatamente agora já é histórico", () => {
    const { upcoming, history } = splitReservations([make("fim", -2, 0)], now);
    expect(upcoming).toHaveLength(0);
    expect(history).toHaveLength(1);
  });
});

describe("canCancel", () => {
  it("só cancela confirmada que ainda não começou", () => {
    expect(canCancel(make("a", 1, 2), now)).toBe(true);
    expect(canCancel(make("b", -1, 1), now)).toBe(false); // em andamento
    expect(canCancel(make("c", -3, -2), now)).toBe(false); // passada
    expect(canCancel(make("d", 1, 2, "CANCELLED"), now)).toBe(false);
  });

  it("início exatamente agora já não permite cancelar", () => {
    expect(canCancel(make("e", 0, 1), now)).toBe(false);
  });
});

describe("statusInfo", () => {
  it("rotula cada situação", () => {
    expect(statusInfo(make("a", 1, 2), now).label).toBe("Confirmada");
    expect(statusInfo(make("b", -1, 1), now).label).toBe("Em andamento");
    expect(statusInfo(make("c", -3, -2), now).label).toBe("Concluída");
    expect(statusInfo(make("d", 1, 2, "CANCELLED"), now).label).toBe(
      "Cancelada",
    );
  });
});
