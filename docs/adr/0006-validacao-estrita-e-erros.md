# ADR 0006: Validação estrita e erros padronizados

- Status: Aceita
- Data: 2026-10-21

## Contexto

Entradas inesperadas e mensagens de erro vazadas são fontes comuns de falhas de segurança.

## Decisão

- Todo corpo de escrita é validado com **Zod** em modo estrito (`strictObject`): **campos desconhecidos são rejeitados**, não ignorados. Isso fecha a porta para *mass assignment* (enviar `role: "ADMIN"` no cadastro).
- Todos os erros usam **um só formato** (`timestamp`, `status`, `error`, `message`, `path` e, na validação, `details` com campo e mensagem). A validação devolve só o campo e a regra, **nunca o valor enviado** (que poderia ser uma senha).
- Toda rota é envolvida por um tratador único (`route()`). Erro inesperado vira `500` genérico, com log estruturado sem a mensagem original (que pode conter dados de colunas) e sem dados sensíveis.
- Violações de restrição do banco que escaparem dos serviços são traduzidas como rede de segurança: sobreposição e duplicidade em `409`, `CHECK` em `422`.
- Datas exigem fuso explícito e múltiplos de 15 minutos.

## Alternativas consideradas

- **Ignorar campos extras:** mais permissivo, e perigoso.
- **Devolver a mensagem do erro do banco:** vazaria nomes de tabelas, colunas e valores.

## Consequências

- Clientes precisam seguir o contrato à risca (por exemplo, não enviar campos extras).
- O formato único de erro é documentado na OpenAPI e coberto por teste.
