# ADR 0003: Autenticação: Argon2id e JWT em cookie `httpOnly`

- Status: Aceita
- Data: 2026-10-21

## Contexto

A API precisa identificar quem faz cada requisição sem expor senhas nem permitir que o cliente escolha o próprio papel.

## Decisão

- **Senhas** guardadas com **Argon2id**; o hash nunca sai da API.
- **Sessão** em um JWT (HS256, `jose`) de **15 minutos**, num cookie `httpOnly`, `SameSite=Lax`. Em produção o cookie usa o prefixo `__Host-` e `Secure`.
- O **papel** (`USER` ou `ADMIN`) é lido do banco a cada requisição. O token carrega só o identificador do usuário.
- O cadastro público sempre cria `USER`. Virar `ADMIN` só por alteração direta no banco.
- **Login uniforme:** e-mail inexistente e senha errada dão a mesma resposta, e um hash "de mentira" é verificado para igualar o tempo de resposta.

## Alternativas consideradas

- **Token em `localStorage`:** exposto a qualquer script injetado (XSS).
- **Papel dentro do token:** um administrador rebaixado continuaria com poder até o token expirar.
- **Sessão em tabela no banco:** permite revogar, mas custa uma consulta extra e mais código; o JWT curto foi suficiente para o escopo.
- **bcrypt:** aceitável, porém o Argon2id resiste melhor a ataques com hardware especializado.

## Consequências

- **Um JWT não pode ser revogado antes de expirar** (no máximo 15 minutos). Não há refresh token.
- O cadastro revela se um e-mail já existe (`409`), uma escolha consciente de usabilidade.
- A defesa contra CSRF vem do `SameSite=Lax`; não há um token CSRF dedicado.
- Remover o papel do token custa uma leitura de usuário por requisição, aceitável pela correção que se ganha.
