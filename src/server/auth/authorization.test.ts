import { describe, it, expect } from "vitest";
import { assertAdmin } from "./authorization";
import { ForbiddenError } from "@/server/http/errors";

describe("assertAdmin", () => {
  it("bloqueia USER", () => {
    expect(() => assertAdmin({ role: "USER" })).toThrow(ForbiddenError);
  });
  it("deixa ADMIN passar", () => {
    expect(() => assertAdmin({ role: "ADMIN" })).not.toThrow();
  });
});
