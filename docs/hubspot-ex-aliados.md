# Leads HubSpot com indicador de ex-aliado

`GET /hubspot/leads/ally` retorna os mesmos contatos, filtros,
ordenacao e paginacao de [`GET /hubspot/leads`](hubspot-leads.md), acrescentando
um booleano `ex_aliado` em cada item.

```http
GET http://localhost:3000/hubspot/leads/ally?limit=50&sort_by=updated_at&order=desc
x-api-key: <INTERNAL_API_KEY>
```

No Insomnia, use **No Auth** e o header `x-api-key`. Nao e necessario JWT.

## Regra

O indicador e `true` quando existe **pelo menos um pedido** com:

- `cliente.pessoa_email` igual ao `email` do contato HubSpot;
- `pedido_status` igual a **2** ou **241**, na raiz do pedido.

A comparacao usa email sem diferenca entre maiusculas/minusculas e sem espacos
nas pontas. O email original do contato e preservado na resposta. Pedidos de
outros status nao tornam o indicador verdadeiro. Se houver varios pedidos,
basta um com status 2 ou 241, mesmo que existam outros pedidos de outros status.
Nenhuma regra adicional de produto ou assinatura ativa e aplicada.

Sem email no contato, sem cliente correspondente ou sem pedido elegivel, o valor
e `false`. O endpoint retorna todos os contatos da pagina, tanto `true` como `false`.

## Resposta

Exemplo parcial; os demais campos originais do contato tambem sao retornados:

```json
{
  "items": [
    {
      "id": "123",
      "email": "lead@example.com",
      "ex_aliado": true
    },
    {
      "id": "456",
      "email": "outro@example.com",
      "ex_aliado": false
    }
  ],
  "meta": {
    "total_items": 2,
    "limit": 50,
    "next_after": null,
    "has_more": false,
    "results_limited": false
  }
}
```

`meta.total_items` continua sendo a contagem de contatos no HubSpot para os
filtros informados. Nao representa a quantidade de ex-aliados. `after`, `limit`,
`sort_by` e `order` continuam funcionando como na listagem original. Preserve
filtros e ordenacao ao avancar pelo cursor.

## Consulta ao data lake

O backend busca uma pagina do HubSpot e executa **uma consulta SQL em lote** para
os emails distintos dessa pagina. Usa as mesmas tabelas e a mesma escolha da
versao mais recente do cliente de [`GET /pedidos`](pedidos.md):
`pedidosdlt.cliente_id = pessoasdlt.id`, com versao da pessoa selecionada por
`COALESCE(ultima_atualizacao, modificado, criado)` decrescente.

O cruzamento considera **todo o historico de pedidos**; nao depende da paginacao
de `/pedidos`. `start_date` e `end_date` filtram apenas a criacao dos contatos no
HubSpot. Os emails usam parametros SQL nomeados. Paginas vazias ou sem emails
nao consultam o Databricks. Nenhum registro e persistido ou alterado.

Sao usadas as configuracoes existentes `HUBSPOT_*` e `DATABRICKS_*`, sem novas
credenciais. Falhas em qualquer fonte retornam erro HTTP (`502`, `503` ou `504`,
conforme a causa), em vez de apresentar `ex_aliado=false` sem verificacao.
Autenticacao invalida retorna `401` e limites de consulta podem retornar `429`.

A resposta usa `Cache-Control: private, no-store`. Os endpoints `/hubspot/leads`
e `/pedidos` mantem seus contratos anteriores.

O ingress Nginx usa timeout de leitura de 140 segundos para comportar a consulta
sequencial ao HubSpot e ao Databricks com os timeouts padrao configurados.
