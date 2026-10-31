import {
  MAX_RESOURCE_NOTE_LENGTH,
  MAX_RESOURCE_QUANTITY,
  setRoomResourcesSchema,
} from "@/server/rooms/schemas";

// Uma linha do formulário "Recursos da sala": só os recursos MARCADOS chegam
// aqui, com o que a pessoa digitou (texto puro, ainda sem confiança).
export type RoomResourceRow = {
  resourceId: string;
  quantity: string;
  note: string;
};

export type ParsedRoomResources =
  | { ok: true; data: { items: ParsedItem[] } }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

type ParsedItem = { resourceId: string; quantity: number; note?: string | null };

export const QUANTITY_ERROR = `Use um número inteiro de 1 a ${MAX_RESOURCE_QUANTITY}.`;
export const NOTE_ERROR = `No máximo ${MAX_RESOURCE_NOTE_LENGTH} caracteres.`;

// Chaves dos erros por campo, as mesmas usadas pelos inputs do formulário.
export const quantityKey = (resourceId: string) => `quantity-${resourceId}`;
export const noteKey = (resourceId: string) => `note-${resourceId}`;

/**
 * Converte o que veio do formulário no formato da API e valida com o MESMO
 * schema dela (setRoomResourcesSchema): as regras não ficam duplicadas.
 * Erros em um recurso aparecem no campo daquele recurso.
 */
export function parseRoomResourcesForm(
  rows: RoomResourceRow[],
): ParsedRoomResources {
  const fieldErrors: Record<string, string> = {};

  // 1) Texto -> número. Só dígitos: "2.5", "1e2", "-1" e "" não são quantidade.
  const items = rows.map((row) => {
    const text = row.quantity.trim();
    const isDigits = /^\d{1,3}$/.test(text);
    if (!isDigits) fieldErrors[quantityKey(row.resourceId)] = QUANTITY_ERROR;
    return {
      resourceId: row.resourceId,
      quantity: isDigits ? Number(text) : 0,
      note: row.note.trim() === "" ? null : row.note,
    };
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Revise os campos destacados.", fieldErrors };
  }

  // 2) Mesmas regras da API (faixa 1..99, tamanho da observação, duplicados...).
  const result = setRoomResourcesSchema.safeParse({ items });
  if (result.success) return { ok: true, data: result.data };

  let general: string | null = null;
  for (const issue of result.error.issues) {
    const [root, index, field] = issue.path;
    const item = typeof index === "number" ? items[index] : undefined;
    if (root === "items" && item && field === "quantity") {
      fieldErrors[quantityKey(item.resourceId)] = QUANTITY_ERROR;
    } else if (root === "items" && item && field === "note") {
      fieldErrors[noteKey(item.resourceId)] = NOTE_ERROR;
    } else if (root === "items" && item && field === "resourceId") {
      general = "Recurso inválido. Recarregue a página e tente de novo.";
    } else {
      general = "Lista de recursos inválida. Recarregue a página e tente de novo.";
    }
  }
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return {
    ok: false,
    message: hasFieldErrors
      ? "Revise os campos destacados."
      : (general ?? "Lista de recursos inválida."),
    fieldErrors,
  };
}
