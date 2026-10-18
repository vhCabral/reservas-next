import { describe, it, expect } from "vitest";
import { validateReservationWindow } from "./reservation-policy";

const now = new Date("2026-10-18T12:00:00Z");
const t = (iso: string) => new Date(iso);
const check = (start: string, end: string) =>
  validateReservationWindow(t(start), t(end), now);

describe("validateReservationWindow", () => {
  it("aceita uma janela válida", () => {
    expect(check("2026-10-18T13:00:00Z", "2026-10-18T14:00:00Z")).toBeNull();
  });
  it("exige múltiplos de 15 minutos", () => {
    expect(check("2026-10-18T13:07:00Z", "2026-10-18T14:00:00Z")).toMatch(
      /15 minutes/,
    );
    expect(check("2026-10-18T13:00:30Z", "2026-10-18T14:00:00Z")).toMatch(
      /15 minutes/,
    );
  });
  it("rejeita fim antes ou igual ao início", () => {
    expect(check("2026-10-18T14:00:00Z", "2026-10-18T14:00:00Z")).toMatch(
      /after start/,
    );
    expect(check("2026-10-18T14:00:00Z", "2026-10-18T13:00:00Z")).toMatch(
      /after start/,
    );
  });
  it("limites de duração: 15 min e 4 h passam; 4 h 15 min não", () => {
    expect(check("2026-10-18T13:00:00Z", "2026-10-18T13:15:00Z")).toBeNull();
    expect(check("2026-10-18T13:00:00Z", "2026-10-18T17:00:00Z")).toBeNull();
    expect(check("2026-10-18T13:00:00Z", "2026-10-18T17:15:00Z")).toMatch(
      /Duration/,
    );
  });
  it("início precisa ser no futuro (agora exato não vale)", () => {
    expect(check("2026-10-18T12:00:00Z", "2026-10-18T13:00:00Z")).toMatch(
      /future/,
    );
    expect(check("2026-10-18T11:45:00Z", "2026-10-18T12:45:00Z")).toMatch(
      /future/,
    );
  });
  it("limite de 90 dias: exatamente 90 passa, 90 dias + 15 min não", () => {
    expect(check("2027-01-16T12:00:00Z", "2027-01-16T13:00:00Z")).toBeNull();
    expect(check("2027-01-16T12:15:00Z", "2027-01-16T13:15:00Z")).toMatch(
      /90 days/,
    );
  });
});
