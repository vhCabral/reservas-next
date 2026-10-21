# ADR 0008: Regras de arquitetura verificadas automaticamente

- Status: Aceita
- Data: 2026-10-21

## Contexto

Em projetos que crescem (e em projetos escritos com ajuda de IA), a organização em camadas se desfaz aos poucos se depender só de disciplina. Já aconteceu aqui: a reserva lia as tabelas de salas direto, contornando a regra de visibilidade do serviço de salas.

## Decisão

Regras escritas com **dependency-cruiser** e executadas por `npm run arch`, também no CI:

1. Rotas não acessam o banco nem repositórios; chamam serviços.
2. `src/server` nunca importa de `src/app`.
3. Um repositório só é usado pela própria funcionalidade.
4. Sem dependências circulares.
5. Código de produção não importa arquivos de teste.

## Alternativas consideradas

- **Convenção em documentação:** não impede ninguém.
- **Pacotes separados por camada:** complexidade desproporcional para o tamanho do projeto.

## Consequências

- Uma violação quebra o CI, e o erro aponta o arquivo e a regra.
- Cada regra foi provada com uma violação proposital que a fez falhar.
- Ao criar uma funcionalidade nova, as regras podem exigir ajustes explícitos (por exemplo, expor uma função no serviço em vez de importar o repositório).
