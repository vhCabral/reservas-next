# ADR 0005: Autorização em duas camadas e proteção contra IDOR

- Status: Aceita
- Data: 2026-10-21

## Contexto

Quase todo ataque a uma API de reservas é de autorização: ler, cancelar ou alterar o que é de outra pessoa (IDOR/BOLA), ou chamar rotas de administrador sem ser um.

## Decisão

- **Duas camadas:** a rota chama `assertAdmin` logo após identificar o usuário (e **antes** de validar o corpo, então um usuário comum recebe `403`, não `400`), e o serviço verifica de novo. Se uma rota esquecer a checagem, o serviço ainda protege.
- **Reserva alheia = `404`:** quem pede a reserva de outra pessoa recebe exatamente o mesmo `404` de uma reserva que não existe, sem confirmar a existência. O administrador enxerga todas.
- O dono é sempre o usuário da sessão; o `userId` nunca vem do corpo da requisição.
- **Salas e recursos inativos** ficam invisíveis para usuário comum (`404`).
- A **disponibilidade** devolve só os intervalos ocupados, sem quem reservou.

## Alternativas consideradas

- **`403` para reserva alheia:** revelaria que o identificador existe.
- **Checar só na rota:** um esquecimento num endpoint novo vira vulnerabilidade.

## Consequências

- Há testes de integração para cada caso (reserva alheia, cancelamento alheio, rota de administrador com usuário comum).
- A regra existe em dois lugares, o que é redundância de propósito.
