# Pedidos do data lake

`GET /pedidos` foi trazido do `api-backoffice` e consulta diretamente o Databricks,
sem persistir registros no PostgreSQL. Preserva o contrato da listagem original:
todas as colunas de pedidos, cliente completo ou `null`, `data`, `pagination` e
`consultadoEm`. Nao filtra por produto/status e nao deduplica pedidos.

## Configuracao

Configure no `.env.local` (ignorado pelo Git) ou nos secrets do ambiente:

```dotenv
DATABRICKS_HOST=adb-7607122378232015.15.azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/0a7731024fd249e0
DATABRICKS_TOKEN=
DATABRICKS_TIMEOUT_MS=120000
```

O token precisa de acesso ao SQL warehouse e leitura das tabelas:

- `data_lake_imperio.default.pedidosdlt`
- `data_lake_imperio.default.pessoasdlt`

O host nao inclui `https://`. O timeout padrao e 120 segundos para conectar,
abrir a sessao, executar SQL e buscar a pagina. O fechamento de recursos pode
adicionar ate 5 segundos. Cada requisicao usa cliente e sessao proprios, que sao
fechados ao terminar; nenhuma conexao e aberta durante a inicializacao da API.
Credenciais ausentes nao impedem o restante da aplicacao de iniciar.

## Testar localmente

Inicie a API na raiz do `lead-score`:

```powershell
npm.cmd run start:dev
```

No Insomnia, escolha **No Auth** e envie:

```http
GET http://localhost:3000/pedidos?page=1&limit=50
x-api-key: <INTERNAL_API_KEY do ambiente local>
```

O endpoint exige apenas `x-api-key`, inclusive com `API_KEY_ENABLED=false`.
O token do Databricks fica somente no backend. A rota tambem aparece no Swagger.

`page` deve ser um inteiro positivo, com padrao 1. `limit` tem padrao 50 e aceita
de 1 a 100. Para continuar, aumente `page` mantendo `limit`. A consulta usa
parametros SQL nomeados para limite e deslocamento; tabelas sao fixas no servidor.

## Resposta

Exemplo parcial; todas as demais colunas da origem tambem sao retornadas:

```json
{
  "data": [
    {
      "id": 456,
      "cliente_id": 123,
      "cliente": {
        "id": 123,
        "pessoa_nome": "Cliente de exemplo",
        "pessoa_email": "cliente@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1,
    "hasNext": false
  },
  "consultadoEm": "2026-11-04T12:00:00.000Z"
}
```

Pedidos sao ordenados por `criado DESC NULLS LAST`, com desempate por `id DESC`.
O cliente vem de `pedidosdlt.cliente_id = pessoasdlt.id`. Se houver varias versoes
da pessoa, escolhe a mais recente por `COALESCE(ultima_atualizacao, modificado,
criado)`. Pedidos sem cliente continuam na resposta, com `cliente: null`.
A consulta busca apenas clientes da pagina e faz uma unica chamada SQL.

O total conta todas as linhas de pedidos, mesmo em paginas vazias. Binarios sao
Base64, datas JavaScript usam ISO 8601 e valores `bigint` usam strings para manter
precisao. `consultadoEm` e o instante de conclusao da consulta, nao a ultima
ingestao do lake. Dados podem mudar entre chamadas; nao ha snapshot entre paginas.

## Erros e deploy

- `400`: paginacao invalida ou offset fora da faixa segura de inteiros.
- `401`: chave interna ausente, invalida ou nao configurada.
- `502`: falha de conexao, token recusado, permissao insuficiente ou erro da consulta.
- `503`: configuracao do Databricks ausente ou invalida.
- `504`: consulta excedeu `DATABRICKS_TIMEOUT_MS`.

Respostas incluem `Cache-Control: no-store`. Erros do driver sao sanitizados para
nao expor credenciais, SQL ou dados pessoais ao cliente.

O Docker Compose repassa as quatro variaveis. Para usar o ambiente local:

```powershell
docker compose --env-file .env.local up --build
```

No AKS, host, path e timeout estao no ConfigMap; configure `DATABRICKS_TOKEN` no
Secret `lead-score-secrets`. O script `create-k8s-secrets.sh` inclui esse token ao
gerar o Secret a partir do `.env`. O arquivo `.env.local` nao e lido por esse script.
O timeout de leitura do ingress Nginx foi ajustado para 140 segundos, acima do
timeout da consulta e fechamento de recursos. Nenhuma publicacao e feita pela
implementacao local.

Driver e ciclo de sessoes: [documentacao oficial do Databricks](https://docs.databricks.com/aws/en/dev-tools/nodejs-sql-driver).
