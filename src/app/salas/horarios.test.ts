import { describe, expect, it } from "vitest";
import { buildSchedule } from "./horarios";

// 12:00 em Brasília (UTC-3) de domingo, 25/10/2026.
const now = new Date("2026-10-25T15:00:00Z");

describe("buildSchedule", () => {
  it("cria um item por dia, mesmo sem reservas", () => {
    const schedule = buildSchedule([], now, 3);
    expect(schedule.map((d) => d.key)).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
    expect(schedule.every((d) => d.busy.length === 0)).toBe(true);
    expect(schedule[0].label).toContain("25 de outubro");
  });

  it("mostra o horário em Brasília, não em UTC", () => {
    const [day] = buildSchedule(
      [
        {
          startAt: new Date("2026-10-25T17:00:00Z"),
          endAt: new Date("2026-10-25T18:30:00Z"),
        },
      ],
      now,
      1,
    );
    expect(day.busy).toEqual([
      { start: "14:00", end: "15:30", endsNextDay: false },
    ]);
  });

  it("usa o dia local: 01:30Z ainda é 22:30 do dia anterior em Brasília", () => {
    const schedule = buildSchedule(
      [
        {
          startAt: new Date("2026-10-26T01:30:00Z"),
          endAt: new Date("2026-10-26T03:30:00Z"),
        },
      ],
      now,
      3,
    );
    expect(schedule[0].busy).toEqual([
      { start: "22:30", end: "00:30", endsNextDay: true },
    ]);
    expect(schedule[1].busy).toEqual([]);
  });

  it("ordena os horários do dia e separa por dia", () => {
    const schedule = buildSchedule(
      [
        {
          startAt: new Date("2026-10-27T12:00:00Z"),
          endAt: new Date("2026-10-27T13:00:00Z"),
        },
        {
          startAt: new Date("2026-10-25T20:00:00Z"),
          endAt: new Date("2026-10-25T21:00:00Z"),
        },
        {
          startAt: new Date("2026-10-25T17:00:00Z"),
          endAt: new Date("2026-10-25T18:00:00Z"),
        },
      ],
      now,
      3,
    );
    expect(schedule[0].busy.map((b) => b.start)).toEqual(["14:00", "17:00"]);
    expect(schedule[2].busy.map((b) => b.start)).toEqual(["09:00"]);
  });

  it("intervalo que começou antes do primeiro dia entra no primeiro dia", () => {
    const [first] = buildSchedule(
      [
        {
          startAt: new Date("2026-10-25T02:30:00Z"), // 23:30 do dia 24, local
          endAt: new Date("2026-10-25T15:30:00Z"),
        },
      ],
      now,
      2,
    );
    expect(first.busy).toHaveLength(1);
  });

  it("ignora intervalos depois do último dia", () => {
    const schedule = buildSchedule(
      [
        {
          startAt: new Date("2026-11-20T12:00:00Z"),
          endAt: new Date("2026-11-20T13:00:00Z"),
        },
      ],
      now,
      3,
    );
    expect(schedule.flatMap((d) => d.busy)).toEqual([]);
  });
});
