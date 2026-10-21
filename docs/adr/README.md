# Decisões de arquitetura (ADRs)

Cada arquivo registra uma decisão importante: o contexto, o que foi escolhido, as alternativas descartadas e as consequências (inclusive o que ficou de fora).

| # | Decisão |
|---|---|
| [0001](0001-postgresql-e-drizzle.md) | PostgreSQL e Drizzle com migrações versionadas |
| [0002](0002-double-booking-no-banco.md) | Double booking impedido pelo banco (`EXCLUDE`) |
| [0003](0003-autenticacao-e-sessao.md) | Autenticação: Argon2id, JWT em cookie `httpOnly` |
| [0004](0004-rate-limit-no-postgresql.md) | Limite de tentativas de login no PostgreSQL |
| [0005](0005-autorizacao-e-anti-idor.md) | Autorização em duas camadas e proteção contra IDOR |
| [0006](0006-validacao-estrita-e-erros.md) | Validação estrita e erros padronizados |
| [0007](0007-testes-com-postgresql-real.md) | Testes com PostgreSQL de verdade, sem Docker |
| [0008](0008-regras-de-arquitetura.md) | Regras de arquitetura verificadas automaticamente |
| [0009](0009-openapi-e-teste-de-contrato.md) | OpenAPI gerada dos schemas e teste de contrato |
