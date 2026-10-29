import {
  createResourceSchema,
  type CreateResourceInput,
} from "@/server/resources/schemas";

export type ResourceFormValues = {
  name: string;
  description: string;
};

export type ResourceFormResult =
  | { ok: true; data: CreateResourceInput }
  | { ok: false; fieldErrors: Record<string, string> };

const MESSAGES: Record<string, string> = {
  name: "Informe o nome do recurso (até 120 caracteres).",
  description: "A descrição pode ter no máximo 500 caracteres.",
};

// Descrição vazia vira null (o schema aceita null, não texto vazio).
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Converte o texto do formulário no formato do schema do serviço e traduz os
 * erros. As regras NÃO são repetidas aqui: quem decide é o createResourceSchema,
 * o mesmo que a API usa.
 */
export function parseResourceForm(
  values: ResourceFormValues,
): ResourceFormResult {
  const result = createResourceSchema.safeParse({
    name: values.name,
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
