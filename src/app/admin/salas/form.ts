import { createRoomSchema, type CreateRoomInput } from "@/server/rooms/schemas";

// Valores do formulário, todos texto (é assim que o navegador envia).
export type RoomFormValues = {
  name: string;
  capacity: string;
  location: string;
  description: string;
};

export type RoomFormResult =
  | { ok: true; data: CreateRoomInput }
  | { ok: false; fieldErrors: Record<string, string> };

const MESSAGES: Record<string, string> = {
  name: "Informe o nome da sala (até 120 caracteres).",
  capacity: "Informe a capacidade: um número inteiro de 1 a 10.000.",
  location: "O local pode ter no máximo 120 caracteres.",
  description: "A descrição pode ter no máximo 500 caracteres.",
};

// Campo opcional vazio vira null (o schema aceita null, não texto vazio).
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Converte o texto do formulário no formato do schema do serviço e traduz os
 * erros. As regras (tamanhos, limites) NÃO são repetidas aqui: quem decide é o
 * createRoomSchema, o mesmo que a API usa. Aqui só se converte e se traduz.
 */
export function parseRoomForm(values: RoomFormValues): RoomFormResult {
  // Só dígitos: recusa "1e3", "-5", "1.5" e "abc" antes de virar número.
  const capacityText = values.capacity.trim();
  const capacity = /^\d{1,5}$/.test(capacityText)
    ? Number(capacityText)
    : Number.NaN;

  const result = createRoomSchema.safeParse({
    name: values.name,
    capacity,
    location: emptyToNull(values.location),
    description: emptyToNull(values.description),
  });

  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = MESSAGES[key] ?? "Valor inválido.";
    }
  }
  return { ok: false, fieldErrors };
}
