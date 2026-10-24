# Plataforma de Reservas de Salas e Auditórios

[![CI](https://github.com/vhCabral/reservas-next/actions/workflows/ci.yml/badge.svg)](https://github.com/vhCabral/reservas-next/actions/workflows/ci.yml)

API para reservar salas e auditórios, feita para ser **segura por construção** e para tornar o **double booking impossível**: duas pessoas nunca conseguem reservar a mesma sala no mesmo horário, nem com requisições simultâneas. Quem garante isso é o próprio banco de dados, não o código da aplicação.

> Projeto de portfólio, em desenvolvimento. A API, os testes, o CI e a documentação OpenAPI estão prontos. O frontend e o deploy (Supabase + Vercel) são os próximos passos.

## Sumário

- [Stack](#stack)
- [Como rodar localmente](#como-rodar-localmente)
- [Testes e CI](#testes-e-ci)
- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Regras de negócio](#regras-de-negócio)
- [API](#api)
- [Deploy](#deploy)
- [Limitações conhecidas](#limitações-conhecidas)

## Stack

| Área                  | Tecnologia                                                      |
| --------------------- | --------------------------------------------------------------- |
| Framework             | Next.js 16 (App Router, Turbopack), TypeScript                  |
| Banco de dados        | PostgreSQL 16                                                   |
| ORM e migrações       | Drizzle ORM + drizzle-kit (migrações versionadas, nunca `push`) |
| Validação             | Zod 4                                                           |
| Senhas                | Argon2id (`@node-rs/argon2`)                                    |
| Sessão                | JWT HS256 (`jose`) em cookie `httpOnly`                         |
| Testes                | Vitest (unitários e de integração com PostgreSQL de verdade)    |
| Regras de arquitetura | dependency-cruiser                                              |
| CI                    | GitHub Actions (com PostgreSQL como serviço)                    |
| Documentação da API   | OpenAPI 3.1 gerada a partir dos schemas Zod                     |

## Como rodar localmente

Pré-requisitos: **Node.js 24** e **PostgreSQL 16** instalados.

### 1. Instale as dependências

```bash
npm ci
```

### 2. Crie os bancos

No `psql`, com um usuário administrador, crie um usuário de aplicação e dois bancos: um para desenvolvimento e outro só para testes.

```sql
CREATE ROLE reservas_app LOGIN PASSWORD 'escolha-uma-senha';
CREATE DATABASE reservas OWNER reservas_app;
CREATE DATABASE reservas_test OWNER reservas_app;
```

### 3. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste os valores:

```dotenv
DATABASE_URL=postgresql://reservas_app:SUA_SENHA@localhost:5432/reservas
JWT_SECRET=<valor gerado abaixo>
JWT_EXPIRATION_MINUTES=15
```

Gere o `JWT_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Nunca versione o `.env.local` nem o `.env.test`: ambos estão no `.gitignore`. Cada pessoa (e cada ambiente) gera o seu próprio segredo.

### 4. Aplique as migrações

```bash
npm run db:migrate
```

### 5. Suba a aplicação

```bash
npm run dev
```

A API fica em `http://localhost:3000` e a documentação OpenAPI em `http://localhost:3000/api/openapi.json`.

### Como criar um administrador

O cadastro público **sempre** cria usuários comuns (`USER`). Não existe rota para virar administrador, de propósito. A promoção é feita direto no banco, por quem tem acesso a ele:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'pessoa@exemplo.com';
```

## Testes e CI

| Comando                    | O que faz                                         |
| -------------------------- | ------------------------------------------------- |
| `npm test`                 | Testes unitários (rápidos, sem banco)             |
| `npm run test:integration` | Testes de integração contra o PostgreSQL de teste |
| `npm run arch`             | Verifica as regras de arquitetura                 |
| `npm run lint`             | ESLint                                            |
| `npx tsc --noEmit`         | Checagem de tipos                                 |
| `npm run build`            | Build de produção                                 |

### Banco de testes

Os testes de integração usam um **PostgreSQL de verdade**, não um mock e não um banco em memória. Criar um `.env.test` com o banco `reservas_test`:

```dotenv
DATABASE_URL=postgresql://reservas_app:SUA_SENHA@localhost:5432/reservas_test
JWT_SECRET=um-segredo-so-para-testes-com-32-caracteres-ou-mais
JWT_EXPIRATION_MINUTES=15
```

As migrações são aplicadas automaticamente antes da suíte, e **somente em bancos cujo nome termina em `_test`**. Isso impede, por construção, que um teste apague dados de desenvolvimento ou de produção.

### O que os testes provam

- **Concorrência:** 10 pedidos simultâneos para o mesmo horário resultam em exatamente 1 reserva confirmada e 9 conflitos.
- **Autorização:** reserva de outra pessoa devolve `404` (proteção contra IDOR/BOLA); rotas de administrador devolvem `403` para usuário comum.
- **Contrato:** as respostas reais da API são comparadas, de forma estrita, com a documentação OpenAPI. Um campo a mais (por exemplo, um hash de senha) faz o teste falhar.
- **Documentação em dia:** um teste falha se existir uma rota no código que não esteja documentada, ou o contrário.

### Integração contínua

Cada push e pull request roda no GitHub Actions, com um PostgreSQL 16 como serviço: checagem de tipos, lint, regras de arquitetura, testes unitários, testes de integração, build e auditoria das dependências de produção (`npm audit`, que bloqueia em severidade alta). O Dependabot abre PRs de atualização semanalmente.

## Arquitetura

Organização por funcionalidade, simples e sem camadas desnecessárias:

```
src/
  app/api/            rotas HTTP: só leem a requisição, validam e chamam um serviço
  server/
    auth/             cadastro, login, sessão, autorização
    rooms/            salas e seus recursos
    resources/        recursos (projetor, quadro...)
    reservations/     reservas, regras de horário, disponibilidade
    rate-limit/       limite de tentativas, no PostgreSQL
    http/             erros padronizados, leitura de requisição
    db/               schema Drizzle e conexão
    openapi/          geração da documentação e testes de contrato
```

Regras verificadas automaticamente por `npm run arch` (e no CI):

1. Rotas não acessam o banco nem repositórios diretamente.
2. `src/server` nunca importa de `src/app`.
3. Um repositório só é usado pela própria funcionalidade.
4. Sem dependências circulares.
5. Código de produção não importa arquivos de teste.

## Segurança

- **Double booking impedido pelo banco:** uma restrição `EXCLUDE USING gist` sobre `tstzrange` (com `btree_gist`) rejeita sobreposição de reservas confirmadas da mesma sala. Reservas coladas (uma termina quando a outra começa) são permitidas. Não há "consulta antes de inserir", que seria vulnerável a condição de corrida.
- **Senhas com Argon2id**; o hash nunca sai da API (e o teste de contrato garante).
- **Sessão em cookie `httpOnly`**, `SameSite=Lax`, com prefixo `__Host-` e `Secure` em produção. O papel do usuário (`USER`/`ADMIN`) é lido do banco a cada requisição, nunca confiado ao token.
- **Login seguro:** resposta idêntica para e-mail inexistente e senha errada, com verificação de hash "de mentira" para igualar o tempo de resposta. Limite de tentativas por IP (20 em 15 min) e por e-mail+IP (5 em 15 min), contado de forma atômica no PostgreSQL com o relógio do banco.
- **Autorização em duas camadas:** na rota (falha rápida, `403` antes de validar o corpo) e no serviço (defesa em profundidade).
- **Anti-IDOR:** reserva de outra pessoa e reserva inexistente devolvem o mesmo `404`. Salas e recursos inativos são invisíveis para usuário comum.
- **Anti mass assignment:** os schemas Zod rejeitam campos desconhecidos (`strictObject`), então ninguém consegue enviar `role: "ADMIN"` no cadastro.
- **Disponibilidade sem dados pessoais:** o endpoint devolve só os intervalos ocupados, sem quem reservou.
- **Erros padronizados e seguros:** formato único, sem vazar valores enviados, mensagens internas ou pilha de execução. Logs estruturados sem dados sensíveis.
- **Segredos fora do repositório**, CI com permissões mínimas (`contents: read`) e auditoria de dependências bloqueante.

## Regras de negócio

- Reservas de **15 minutos a 4 horas**, começando e terminando em múltiplos de 15 minutos.
- O início deve estar no futuro e a, no máximo, **90 dias** à frente.
- Horários precisam trazer fuso explícito, por exemplo `2026-12-01T10:00:00-03:00`.
- O dono cancela até o início da reserva. O administrador cancela qualquer reserva, a qualquer momento. Cancelar é idempotente.
- Reservas não são editadas: cancela-se e cria-se outra.
- Códigos de erro: `400` formato inválido, `401` não autenticado, `403` sem permissão, `404` não encontrado, `409` conflito (por exemplo, sala já reservada), `422` regra de negócio violada, `429` muitas tentativas.

## API

A especificação completa (OpenAPI 3.1) é servida em **`GET /api/openapi.json`**.

| Método          | Rota                            | Acesso              |
| --------------- | ------------------------------- | ------------------- |
| `POST`          | `/api/auth/register`            | público             |
| `POST`          | `/api/auth/login`               | público             |
| `POST`          | `/api/auth/logout`              | público             |
| `GET`           | `/api/users/me`                 | autenticado         |
| `GET` / `POST`  | `/api/rooms`                    | autenticado / admin |
| `GET` / `PATCH` | `/api/rooms/{id}`               | autenticado / admin |
| `GET`           | `/api/rooms/{id}/availability`  | autenticado         |
| `GET` / `PUT`   | `/api/rooms/{id}/resources`     | autenticado / admin |
| `GET` / `POST`  | `/api/resources`                | autenticado / admin |
| `PATCH`         | `/api/resources/{id}`           | admin               |
| `GET` / `POST`  | `/api/reservations`             | autenticado         |
| `GET`           | `/api/reservations/{id}`        | dono ou admin       |
| `POST`          | `/api/reservations/{id}/cancel` | dono ou admin       |
| `GET`           | `/api/openapi.json`             | público             |

## Decisões de arquitetura

As principais decisões, com o contexto, as alternativas descartadas e as consequências, estão registradas em [`docs/adr`](docs/adr/README.md).

## Deploy

A API está publicada em **https://reservas-next-ten.vercel.app** (a documentação OpenAPI fica em [`/api/openapi.json`](https://reservas-next-ten.vercel.app/api/openapi.json)).

| Peça       | Serviço                                                           |
| ---------- | ----------------------------------------------------------------- |
| Hospedagem | Vercel (plano Hobby), com deploy automático a cada push na `main` |
| Banco      | Supabase (PostgreSQL, plano gratuito), região East US             |

As decisões e os motivos estão no [ADR 0010](docs/adr/0010-deploy-supabase-e-vercel.md).

### Variáveis de ambiente de produção

Cadastradas na Vercel, **somente no ambiente Production**. Os valores nunca vão para o repositório.

| Variável                 | Valor                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | URL do Transaction pooler do Supabase (porta 6543). Marcada como _Sensitive_                 |
| `DATABASE_SSL`           | `true` (conexão criptografada com o certificado do Supabase verificado)                      |
| `JWT_SECRET`             | Segredo novo e exclusivo de produção, com pelo menos 32 caracteres. Marcada como _Sensitive_ |
| `JWT_EXPIRATION_MINUTES` | `15`                                                                                         |

### Aplicar migrações em produção

As migrações **não** rodam sozinhas no deploy. Elas são aplicadas de propósito, a partir do computador de quem publica, usando o Session pooler (porta 5432) em um arquivo local ignorado pelo Git (`.env.production.migrate`, com uma linha `DATABASE_URL=...`):

```powershell
$env:ENV_FILE=".env.production.migrate"; npm run db:migrate; Remove-Item Env:ENV_FILE
```

O comando imprime o host usado (nunca a senha): confira que é o do Supabase e não `localhost`. O `drizzle-kit` pode terminar sem mensagem mesmo quando falha; para ter certeza, consulte as tabelas no banco.

### Primeiro administrador

O cadastro público sempre cria `USER`. Para promover alguém, no SQL Editor do Supabase:

```sql
update users set role = 'ADMIN' where email = 'seu-email@exemplo.com';
```

### Verificado em produção

- Documentação pública por HTTPS, cadastro e login com cookie `__Host-session` (`Secure`, `HttpOnly`, `SameSite=Lax`).
- Usuário comum criando sala recebe `403`; sem cookie, `401`.
- A mesma reserva repetida recebe `409`, vindo da restrição do banco.
- Depois de 5 logins errados, o limite responde `429`.

## Limitações conhecidas

Registradas aqui de propósito: saber o que não está coberto faz parte de uma boa decisão de segurança.

- **O JWT não pode ser revogado antes de expirar** (15 minutos). Não há refresh token nem lista de revogação.
- **O cadastro revela se um e-mail já existe** (resposta `409`). É uma escolha de usabilidade, aceita conscientemente.
- **Ataque distribuído contra um e-mail só** (muitos IPs diferentes) não é coberto pelo limite de tentativas, que combina e-mail com IP.
- **O IP do cliente vem de `X-Forwarded-For`**, confiável apenas atrás de um proxy confiável (como a Vercel).
- **Nome de recurso único diferencia maiúsculas de minúsculas.** A correção prevista é um índice único sobre `lower(name)`.
- **Não há tela nem rota para gerenciar usuários**; a promoção a administrador é feita direto no banco.
- **Linhas expiradas da tabela de limite de tentativas ainda não são limpas** por uma rotina agendada.
