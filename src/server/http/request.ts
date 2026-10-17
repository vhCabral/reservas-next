import "server-only";
import { BadRequestError } from "@/server/http/errors";

// request.json() lança SyntaxError se o corpo não for JSON válido. Sem este
// tratamento, uma requisição malformada do cliente viraria erro 500.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}
