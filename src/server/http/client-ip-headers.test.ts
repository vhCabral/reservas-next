import { describe, expect, it } from "vitest";
import { getClientIp, getClientIpFromHeaders } from "./client-ip";

describe("getClientIpFromHeaders", () => {
  it("usa o primeiro valor de x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(getClientIpFromHeaders(h)).toBe("203.0.113.7");
  });

  it("cai para x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.4" });
    expect(getClientIpFromHeaders(h)).toBe("198.51.100.4");
  });

  it("devolve unknown sem cabeçalhos", () => {
    expect(getClientIpFromHeaders(new Headers())).toBe("unknown");
  });

  it("getClientIp(Request) continua funcionando", () => {
    const req = new Request("http://localhost/x", {
      headers: { "x-forwarded-for": "192.0.2.9" },
    });
    expect(getClientIp(req)).toBe("192.0.2.9");
  });
});
