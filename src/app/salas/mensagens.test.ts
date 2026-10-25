import { describe, expect, it } from "vitest";
import { validateReservationWindow } from "@/server/reservations/reservation-policy";
import { FALLBACK_POLICY_MESSAGE, translatePolicyProblem } from "./mensagens";

const now = new Date("2026-10-25T15:00:00Z");
const MIN = 60_000;
const at = (offsetMin: number) => new Date(now.getTime() + offsetMin * MIN);

describe("translatePolicyProblem", () => {
  // Cada caso provoca uma regra REAL da política e exige uma tradução própria.
  const cases: Array<[string, Date, Date]> = [
    ["múltiplos de 15", at(61), at(121)], // início fora da marca de 15 min
    ["fim antes do início", at(120), at(60)],
    ["duração curta/longa", at(60), at(60 + 5 * 60)],
    ["início no passado", at(-60), at(-30)],
    ["mais de 90 dias", at(91 * 24 * 60), at(91 * 24 * 60 + 60)],
  ];

  it.each(cases)("traduz a regra: %s", (_nome, start, end) => {
    // Alinha ao relógio de 15 min só onde o caso quer uma regra diferente.
    const problem = validateReservationWindow(start, end, now);
    expect(problem).not.toBeNull();
    expect(translatePolicyProblem(problem as string)).not.toBe(
      FALLBACK_POLICY_MESSAGE,
    );
  });

  it("usa a mensagem genérica para regras desconhecidas", () => {
    expect(translatePolicyProblem("Something new")).toBe(FALLBACK_POLICY_MESSAGE);
  });
});
