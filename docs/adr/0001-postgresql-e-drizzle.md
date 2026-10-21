# ADR 0001: PostgreSQL e Drizzle com migrações versionadas

- Status: Aceita
- Data: 2026-10-21

## Contexto

Reservas exigem consistência forte: duas pessoas não podem ocupar a mesma sala no mesmo horário, mesmo com requisições simultâneas. Isso pede transações e restrições que o próprio banco faça valer.

## Decisão

- **PostgreSQL 16** como banco.
- **Drizzle ORM** com o schema em TypeScript e **migrações SQL versionadas**, geradas com `drizzle-kit generate` e aplicadas com `drizzle-kit migrate`. Nunca se usa `push` direto.
- Identificadores `uuid`, datas em `timestamptz`, papéis e status como `enum`.
- Regras de integridade também no banco, com `CHECK`: capacidade positiva, fim depois do início, duração entre 15 minutos e 4 horas, e-mail sempre em minúsculas.

## Alternativas consideradas

- **Banco NoSQL:** não oferece restrição de exclusão sobre intervalos de tempo.
- **Prisma:** viável, mas o Drizzle fica mais próximo do SQL e permite escrever SQL à mão nas migrações, o que foi necessário aqui.
- **`drizzle-kit push`:** altera o banco sem deixar histórico, inaceitável para algo que vai a produção.

## Consequências

- Cada mudança de estrutura vira um arquivo de migração revisável.
- O Drizzle não descreve restrições `EXCLUDE` no schema, então a regra de não sobreposição vive numa migração SQL escrita à mão (ver ADR 0002).
- O projeto depende de recursos específicos do PostgreSQL (extensão `btree_gist`).
