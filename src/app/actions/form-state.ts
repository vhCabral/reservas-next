// Estado devolvido pelas Actions de formulário. Só texto e nomes de campos:
// nunca senha nem registros do banco.
export type FormState = {
  message?: string;
  ok?: boolean; // true = a message é de sucesso
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};
