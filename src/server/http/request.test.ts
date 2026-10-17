import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/server/http/errors";
import { readJson } from "@/server/http/request";

function post(body: string): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("readJson", () => {
  it("devolve o JSON enviado", async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("transforma JSON inválido em BadRequestError (400), e não em erro 500", async () => {
    await expect(readJson(post("{nao-e-json"))).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it("transforma corpo vazio em BadRequestError", async () => {
    await expect(readJson(post(""))).rejects.toBeInstanceOf(BadRequestError);
  });
});
