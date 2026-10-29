# ADR 0011: Recursos da sala com quantidade e observação no vínculo

- Status: Aceita
- Data: 2026-10-28

## Contexto

O catálogo de recursos (Projetor, Ar-condicionado...) diz que tipos de coisa existem, mas não diz o que cada sala tem. Uma sala pode ter 2 aparelhos de ar-condicionado e outra apenas 1, e o modelo (por exemplo "Epson EB-X06") muda de sala para sala. Até aqui o vínculo entre sala e recurso só guardava "tem" ou "não tem".

## Decisão

- A tabela `room_resources` ganha `quantity` (inteiro, de 1 a 99, padrão 1) e `note` (texto opcional de até 200 caracteres). Os dois ficam no **vínculo**, não no recurso: o mesmo "Projetor" tem modelo e quantidade diferentes em cada sala.
- Os limites valem em três lugares: o schema Zod (validação da API e da tela), o serviço (protege quem o chamar direto) e um `CHECK` no banco para a quantidade.
- `PUT /api/rooms/{id}/resources` passa a receber `{ "items": [{ "resourceId", "quantity", "note" }] }` em vez de `{ "resourceIds": [...] }`. A API não tem clientes externos, então o formato antigo foi trocado, sem compatibilidade. O mesmo recurso não pode aparecer duas vezes na lista.
- Observação vazia ou só com espaços vira `null`. Quantidade omitida vale 1.
- A migração é **aditiva** (colunas novas com valor padrão): os vínculos existentes ficam com quantidade 1 e sem observação, e o código antigo continua funcionando com o banco novo. Por isso ela pode ser aplicada em produção antes do deploy do código.

## Alternativas consideradas

- **Repetir o recurso no catálogo ("Ar-condicionado 2x"):** polui o catálogo e não resolve o modelo.
- **Quantidade e modelo na descrição da sala:** texto livre, impossível de filtrar ou validar.
- **Uma linha por unidade física:** mais flexível, mas exagerado para o que a tela precisa mostrar.

## Consequências

- A leitura (`GET`) devolve `quantity` e `note` junto com os dados do recurso; o OpenAPI e o teste de contrato foram atualizados.
- Só ADMIN altera; usuário comum apenas lê, e recurso inativo continua escondido dele.
- Não há histórico de mudanças: ao salvar, o conjunto inteiro é substituído (tudo ou nada, em uma transação).
