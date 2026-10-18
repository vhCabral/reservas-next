import { describe, it, expect } from "vitest";
import { getClientIp } from "./client-ip";

const req = (h: Record<string, string>) =>
  new Request("http://x", { headers: h });

describe("getClientIp", () => {
  it("usa o primeiro IP do x-forwarded-for", () => {
    expect(getClientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe(
      "1.2.3.4",
    );
  });
  it("cai para x-real-ip e depois para unknown", () => {
    expect(getClientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(getClientIp(req({}))).toBe("unknown");
  });
});
