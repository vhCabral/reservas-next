# ADR 0004: Limite de tentativas de login no PostgreSQL

- Status: Aceita
- Data: 2026-10-21

## Contexto

O login precisa resistir a força bruta. A hospedagem prevista (Vercel) é sem estado: cada requisição pode cair em outra instância, então um contador em memória não funciona.

## Decisão

Contar as tentativas numa tabela do PostgreSQL (`rate_limits`), de forma atômica:

- `INSERT … ON CONFLICT … DO UPDATE` numa só instrução, com o **relógio do banco** (`now()`), sem corrida entre instâncias.
- Dois limites: **por IP** (20 tentativas em 15 minutos) e **por e-mail + IP** (5 em 15 minutos). O contador do par é zerado após um login bem-sucedido.
- As chaves são guardadas **com hash SHA-256**, para não gravar e-mails nem IPs em texto claro.
- O limite é verificado **antes** do Argon2id, para não gastar CPU com quem já está bloqueado.
- O IP vem de `X-Forwarded-For`, confiável apenas atrás de proxy confiável (a Vercel).

## Alternativas consideradas

- **Memória da aplicação:** não é compartilhada entre instâncias.
- **Redis/Upstash:** funciona bem, mas adiciona um serviço só para isso quando o PostgreSQL já está disponível.

## Consequências

- Cada tentativa de login faz escritas no banco.
- Linhas expiradas ainda não são removidas por uma rotina agendada (item do roteiro).
- Um ataque distribuído contra um único e-mail, vindo de muitos IPs, não é coberto pelo limite combinado.
