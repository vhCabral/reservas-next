# ADR 0010: Deploy no Supabase e na Vercel

- Status: Aceita
- Data: 2026-10-24

## Contexto

O projeto precisa estar no ar para ser avaliado, sem custo e sem Docker. A aplicação é serverless (cada requisição pode cair em uma instância diferente) e o banco guarda as garantias mais importantes (ADR 0002 e ADR 0004). Publicar mudou o ambiente em quase tudo: HTTPS de verdade, outro banco, outro modo de conexão e outro lugar onde ficam os segredos.

## Decisão

- **Banco:** Supabase (PostgreSQL gerenciado, plano gratuito), região East US (North Virginia).
  - A **Data API está desligada** e as tabelas novas não são expostas automaticamente. O acesso ao banco é só pela nossa API.
  - O **RLS automático está ligado** (gatilho `ensure_rls`), e as 6 tabelas do schema `public` têm RLS ativo, sem políticas. É uma segunda trava: se a Data API for ligada por engano, as tabelas continuam fechadas. A aplicação conecta como `postgres`, que ignora o RLS, direto pelo protocolo do Postgres.
- **Duas conexões, cada uma para um uso:**
  - **Aplicação:** Transaction pooler (porta 6543), indicado para funções serverless.
  - **Migrações:** Session pooler (porta 5432), rodada do computador de quem faz o deploy. A conexão direta do Supabase gratuito só funciona por IPv6.
- **Migrações manuais e explícitas.** O `drizzle.config.ts` lê o arquivo indicado em `ENV_FILE` (padrão: `.env.local`, o banco de desenvolvimento). Para produção, aponta-se de propósito para `.env.production.migrate`, que o Git ignora. O host usado é impresso (nunca a senha), para conferir em qual banco se está mexendo.
- **SSL verificado de ponta a ponta:** o Supabase está com *Enforce SSL* ligado, e a aplicação usa `DATABASE_SSL=true` com o certificado do Supabase (`src/server/db/supabase-ca.ts`) e `rejectUnauthorized: true`. Nunca se desliga a verificação.
- **Hospedagem:** Vercel (plano Hobby), com deploy automático a cada push na `main`. O app da Vercel no GitHub tem acesso apenas a este repositório.
- **Segredos:** só nas variáveis de ambiente da Vercel, **apenas no ambiente Production**; `DATABASE_URL` e `JWT_SECRET` marcadas como *Sensitive*. O `JWT_SECRET` de produção é um valor novo, diferente do de desenvolvimento.
- **Primeiro administrador:** promovido por `UPDATE` direto no banco (a API não tem rota para isso).

## Alternativas consideradas

- **Rodar as migrações automaticamente no build:** o build passaria a ter permissão de alterar a estrutura do banco a cada deploy, inclusive em previews.
- **Conexão direta com o banco:** só IPv6 no plano gratuito, e sem o pooler cada instância serverless abriria conexões demais.
- **`rejectUnauthorized: false`:** funcionaria com qualquer certificado, mas abre a porta para interceptação.
- **Variáveis também no ambiente Preview:** os deploys de pull requests (inclusive os do Dependabot) rodariam com as credenciais de produção.
- **Outras hospedagens:** exigiriam cartão ou perderiam a integração direta com o Next.js.

## Consequências

- **Migrações manuais podem ser esquecidas.** Antes de publicar código que depende de uma migração nova, ela precisa ser aplicada em produção.
- Deploys de pré-visualização de pull requests **falham** por falta das variáveis, de propósito. Para testar uma mudança, usa-se o CI.
- O certificado do Supabase está embutido no código e precisa ser trocado se o Supabase mudar de autoridade certificadora.
- No plano gratuito o Supabase pode pausar o projeto por inatividade, e as funções serverless têm partida a frio.
- Banco e funções ficam na costa leste dos EUA, o que adiciona latência para quem está no Brasil.
- A limpeza das linhas expiradas de `rate_limits` continua pendente.

## Verificado em produção

Além dos testes automatizados, foram provados no ambiente real:

- `/api/openapi.json` público, por HTTPS.
- Cadastro (papel sempre `USER`, sem campo de senha na resposta) e login, com cookie `__Host-session` (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 15 minutos).
- `/api/users/me` com cookie devolve o usuário; sem cookie, `401`.
- Usuário comum criando sala: `403`. Administrador: sala criada.
- Reserva confirmada e a mesma reserva repetida: `409`, vindo da restrição `reservations_no_overlap`.
- Limite de login: cinco `401` e, depois, `429`, o que confirma que o IP chega certo atrás da Vercel.
