# ADR 0007: Testes com PostgreSQL de verdade, sem Docker

- Status: Aceita
- Data: 2026-10-21

## Contexto

As garantias mais importantes do sistema (não sobreposição, concorrência, restrições) vivem no banco. Testá-las com um mock ou um banco em memória não prova nada. A abordagem usual seria Testcontainers, que exige Docker; o ambiente de desenvolvimento deste projeto não usa Docker.

## Decisão

- Testes de integração rodam contra um **PostgreSQL real**: um banco local `reservas_test` no desenvolvimento e um serviço `postgres:16` do GitHub Actions no CI.
- Os testes **nunca** apontam para o banco de desenvolvimento ou de produção (Supabase). A preparação aplica as migrações **somente em bancos cujo nome termina em `_test`**.
- Suítes separadas: testes unitários (rápidos, sem banco) e de integração (com banco, executados em série por compartilharem o mesmo banco). Cada teste limpa o que criou, por prefixo.

## Alternativas consideradas

- **Testcontainers:** o ideal em isolamento, mas exige Docker.
- **Mock do banco ou SQLite:** não reproduz `EXCLUDE`, `tstzrange` nem o comportamento de concorrência.

## Consequências

- Quem roda os testes de integração precisa de um PostgreSQL local e de um `.env.test`.
- Os testes de integração são mais lentos que os unitários, mas provam o que importa.
- O CI usa o mesmo tipo de banco, então "passa na minha máquina" e "passa no CI" significam a mesma coisa.
