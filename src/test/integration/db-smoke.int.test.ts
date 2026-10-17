import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
afterAll(() => pool.end());

describe("banco de teste", () => {
  it("tem a constraint anti double booking", async () => {
    const r = await pool.query(
      "select 1 from pg_constraint where conname = 'reservations_no_overlap' and contype = 'x'",
    );
    expect(r.rowCount).toBe(1);
  });
});
