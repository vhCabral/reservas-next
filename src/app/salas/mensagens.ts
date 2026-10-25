// A API devolve as regras em inglês (são mensagens técnicas). Na tela mostramos
// português. O teste mensagens.test.ts garante que toda regra atual da política
// tem tradução: se alguém mudar o texto lá, o teste falha aqui.
export const FALLBACK_POLICY_MESSAGE =
  "Horário inválido. Confira a data, o início e a duração.";

export function translatePolicyProblem(problem: string): string {
  if (problem === "Start and end must be multiples of 15 minutes") {
    return "O início e o fim precisam ser em múltiplos de 15 minutos (por exemplo, 14:00 ou 14:15).";
  }
  if (problem === "End must be after start") {
    return "O fim precisa ser depois do início.";
  }
  if (problem === "Duration must be between 15 minutes and 4 hours") {
    return "A duração precisa ser de 15 minutos a 4 horas.";
  }
  if (problem === "Start must be in the future") {
    return "O início precisa estar no futuro.";
  }
  if (problem.startsWith("Reservations can be made at most ")) {
    return "Só é possível reservar com até 90 dias de antecedência.";
  }
  return FALLBACK_POLICY_MESSAGE;
}
