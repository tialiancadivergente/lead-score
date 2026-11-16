# Consulta de contatos do HubSpot

`GET /hubspot/leads` consulta o objeto **contacts** do HubSpot em cada chamada.
Nao importa, grava ou atualiza contatos no banco local nem envia contatos ao
ActiveCampaign. O modulo nao possui entidades, migrations, filas ou scheduler.

Para cruzar os contatos com pedidos e incluir `ex_aliado`, use
[`GET /hubspot/leads/ally`](hubspot-ex-aliados.md).

## Configuracao

Configure no `.env.local` ou nos secrets do ambiente de execucao:

```dotenv
HUBSPOT_BASE_URL=https://api.hubapi.com
HUBSPOT_ACCESS_TOKEN=
HUBSPOT_REQUEST_TIMEOUT_MS=10000
```

Preencha `HUBSPOT_ACCESS_TOKEN` com o token do app instalado na conta HubSpot,
com permissao **crm.objects.contacts.read**. Nao coloque esse token no Lovable,
nos parametros da requisicao ou no repositorio. Para uma unica conta, o app pode
usar autenticacao estatica; varias contas exigem um fluxo OAuth proprio.

A aplicacao pode iniciar sem o token; apenas a consulta retorna `503` ate que
ele seja configurado. O timeout deve estar entre 1 e 60000 milissegundos.
No AKS, forneca essas variaveis no Secret/ConfigMap consumido pelo deployment.

## Autenticacao da nossa API

Envie apenas o header `x-api-key` com o valor de `INTERNAL_API_KEY` configurado
no backend. A chave e obrigatoria neste endpoint, inclusive quando
`API_KEY_ENABLED=false`. Nao e necessario login, cookie ou header `Authorization`.

## Parametros

| Parametro        | Regra                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `limit`          | Inteiro entre 1 e 200, padrao 50.                                                                              |
| `sort_by`        | Campo de ordenacao: `created_at` (criacao, padrao) ou `updated_at` (ultima atualizacao).                       |
| `order`          | Direcao pelo campo `sort_by`: `asc` (mais antigos primeiro) ou `desc` (mais recentes primeiro). Padrao `desc`. |
| `after`          | Cursor `meta.next_after` da resposta anterior. Omitir na primeira chamada.                                     |
| `start_date`     | Inicio inclusivo da data de criacao do contato (`createdate`).                                                 |
| `end_date`       | Fim inclusivo da data de criacao do contato (`createdate`).                                                    |
| `lifecyclestage` | Valor interno exato, como `lead`, `marketingqualifiedlead`, `salesqualifiedlead` ou `customer`.                |
| `hs_lead_status` | Valor interno exato configurado no portal, como `NEW`, `IN_PROGRESS` ou `CONNECTED`.                           |
| `email`          | Email exato.                                                                                                   |
| `q`              | Busca textual nativa do HubSpot, incluindo nome, email e telefone.                                             |

Os filtros sao combinados com AND. Sem `lifecyclestage`, todos os estagios sao
incluidos: o termo "leads" neste endpoint representa contatos, inclusive clientes.
Valores de estagio/status sao devolvidos como codigos internos. O frontend pode
mapear os codigos para seus rotulos; os valores personalizados dependem do portal.

Datas `YYYY-MM-DD` usam **UTC**, seguindo a convencao da listagem de captures:
inicio as 00:00:00.000 e fim as 23:59:59.999. Para representar dias no horario de
Sao Paulo, envie datetimes com fuso, por exemplo
`2026-11-01T00:00:00-03:00` e `2026-11-03T23:59:59.999-03:00`.
Datetimes sem fuso e datas inexistentes sao rejeitados.

```http
GET /hubspot/leads?start_date=2026-11-01&end_date=2026-11-03&limit=50&sort_by=updated_at&order=desc
x-api-key: <INTERNAL_API_KEY>
```

Resposta ilustrativa:

```json
{
  "items": [
    {
      "id": "123456",
      "name": "Maria Silva",
      "firstname": "Maria",
      "lastname": "Silva",
      "email": "maria@example.com",
      "phone": "+5511999999999",
      "mobilephone": null,
      "company": null,
      "lifecyclestage": "lead",
      "hs_lead_status": "NEW",
      "hubspot_owner_id": "7",
      "hs_analytics_source": "PAID_SEARCH",
      "created_at": "2026-11-03T12:00:00Z",
      "updated_at": "2026-11-03T12:00:00Z"
    }
  ],
  "meta": {
    "total_items": 51,
    "limit": 50,
    "next_after": "50",
    "has_more": true,
    "results_limited": false
  }
}
```

O exemplo omite os outros contatos da primeira pagina. Para a proxima pagina,
repita os mesmos filtros, `sort_by`, `order` e `limit`, acrescentando `after=50`. Ao mudar filtros ou ordenacao,
reinicie a paginacao. `meta.total_items` e a contagem informada pelo HubSpot para
a busca inteira; `items.length` e apenas a quantidade na pagina atual. Use o total
na Visao geral para contar contatos criados no periodo.

## Integracao com o Lovable

Substitua a chamada direta ao HubSpot por `GET /hubspot/leads` no backend deste
projeto, enviando o header `x-api-key`. Leia os contatos em `items`, a contagem em
`meta.total_items` e o cursor em `meta.next_after`. A chave interna da nossa API
e o token do HubSpot sao credenciais diferentes; o token HubSpot fica somente
no backend.

## Limites e erros

O backend usa `POST /crm/v3/objects/contacts/search`, que e uma operacao de leitura.
Ordena pelo campo `sort_by`: `created_at` usa `createdate` e `updated_at` usa
`lastmodifieddate` no HubSpot. A direcao segue `order`; o padrao e criacao
decrescente. Os filtros `start_date` e `end_date` continuam filtrando a criacao,
independentemente do campo de ordenacao. Faz uma requisicao ao HubSpot por chamada.
Contatos arquivados nao aparecem e registros recentes podem ter atraso de indexacao.
As paginas refletem dados vivos; alteracoes na conta entre chamadas podem mudar os
resultados.

A Search API do HubSpot permite ate **200 contatos por pagina**, **10.000 resultados
acessiveis por busca** e **5 consultas por segundo por conta**. Quando o total supera
10.000, `results_limited=true`; restrinja o periodo ou outros filtros. O backend
encerra a paginacao no limite e ajusta `limit` se a ultima pagina precisar ser menor.
Nao tenta carregar todas as paginas nem efetua retries automaticos.

| HTTP | Significado                                                                         |
| ---- | ----------------------------------------------------------------------------------- |
| 400  | Parametros invalidos ou filtros recusados pelo HubSpot.                             |
| 401  | Chave x-api-key ausente, invalida ou INTERNAL_API_KEY nao configurada.              |
| 429  | Limite local ou do HubSpot atingido; tente novamente depois.                        |
| 502  | Token HubSpot recusado, escopo insuficiente, falha de conexao ou resposta invalida. |
| 503  | Token/configuracao ausente ou HubSpot temporariamente indisponivel.                 |
| 504  | Timeout na consulta ao HubSpot.                                                     |

Corpos de erro do HubSpot e dados de autenticacao nao sao repassados ao cliente.
A resposta usa `Cache-Control: private, no-store`.

Referencias oficiais:

- [Busca no CRM](https://developers.hubspot.com/docs/api-reference/legacy/crm/search-the-crm)
- [Configuracao de autenticacao e escopos](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/app-configuration)
