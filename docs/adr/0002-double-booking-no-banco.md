# ADR 0002: Double booking impedido pelo banco (`EXCLUDE`)

- Status: Aceita
- Data: 2026-10-21

## Contexto

O requisito central é que a mesma sala nunca tenha duas reservas confirmadas sobrepostas. Verificar antes de inserir ("há reserva nesse horário?") é vulnerável a condição de corrida: duas requisições simultâneas passam na verificação e as duas inserem.

## Decisão

Uma restrição `EXCLUDE USING gist` (com a extensão `btree_gist` e `tstzrange`) rejeita, dentro do banco, reservas confirmadas da mesma sala cujos intervalos se sobreponham. Está na migração `drizzle/0001_reservations_no_overlap.sql`.

- O intervalo é **semiaberto** (`[início, fim)`): uma reserva que termina às 11:00 e outra que começa às 11:00 não se sobrepõem.
- Só reservas `CONFIRMED` participam. Cancelar libera o horário.
- A aplicação **não** faz consulta prévia. Ela tenta inserir e traduz a violação (código `23P01`) em `409 Conflict`.

## Alternativas consideradas

- **`SELECT` antes do `INSERT`:** corrida, como descrito.
- **Trava de linha ou nível de isolamento `SERIALIZABLE`:** funciona, mas é mais complexo, mais lento e depende de lembrar de usá-lo em todo lugar.
- **Fila ou lock distribuído na aplicação:** não protege contra outro cliente escrevendo no banco.

## Consequências

- A garantia vale para qualquer caminho que escreva no banco, não só para esta API.
- Há um teste com 10 pedidos simultâneos para o mesmo horário: exatamente 1 vence e 9 recebem conflito.
- Uma futura reserva antecipada com aprovação (status `PENDING`) não vai bloquear horários enquanto não for confirmada, e a aprovação pode falhar com `409` se o horário já tiver sido ocupado.
