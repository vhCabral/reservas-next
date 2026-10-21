# ADR 0009: OpenAPI gerada dos schemas e teste de contrato

- Status: Aceita
- Data: 2026-10-21

## Contexto

Documentação de API costuma envelhecer e passar a mentir. A API já tem schemas Zod que definem exatamente o que aceita.

## Decisão

- A especificação **OpenAPI 3.1** é gerada em código: os formatos de **entrada** vêm direto dos schemas Zod (campos, limites, `additionalProperties: false`), então não existe uma segunda cópia para esquecer de atualizar. É servida em `GET /api/openapi.json`.
- Os formatos de **resposta** são descritos à mão num arquivo próprio.
- Um **teste de contrato** chama os serviços reais e compara cada resposta, de forma estrita, com a documentação: um campo a mais (por exemplo, um hash de senha) ou a menos faz o teste falhar.
- Um teste de **rotas** falha se existir rota no código que não está documentada, ou o contrário. Outro valida que o documento é um OpenAPI 3.1 correto.

## Alternativas consideradas

- **Arquivo YAML escrito à mão:** envelhece sem aviso.
- **Gerar tudo por decoradores ou bibliotecas:** mais peso e dependências para um ganho pequeno.

## Consequências

- O teste de contrato já pegou um erro real: a lista de recursos de uma sala devolve um resumo, sem datas, e a documentação prometia o recurso completo.
- Mudar uma resposta exige atualizar a documentação, e os testes avisam quando isso for esquecido.
- A especificação é pública; descreve a forma da API, não dados.
