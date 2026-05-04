# Dashboard de Lançamentos — Manual Técnico e Operacional

## 1. Contexto

O Dashboard de Lançamentos foi implementado para habilitar leitura analítica de mídia em granularidade por anúncio/dia (`ad/day`), sem quebrar a trilha legada já existente em campanha/dia (`campaign/day`).

Antes desta evolução, o backend já possuía:

- OAuth Google Ads
- OAuth Meta Ads
- sincronização de contas
- criação e processamento de jobs
- raw storage
- consolidado legado `marketing_campaign_daily_performance`

O problema era que a trilha legada não atendia o dashboard por anúncio, porque operava em nível de campanha e não tinha uma chave canônica estável para cruzar mídia e cadastro.

Por isso foi criada uma trilha nova, paralela e compatível:

- nova tabela consolidada `marketing_ad_daily_performance`
- chave oficial de join com cadastro via `capture.external_ad_id`
- endpoints read-only isolados em `marketing-dashboard`
- scheduler horário opcional para manter a trilha atualizada

### Diferença entre trilha legada e trilha nova

Trilha legada:

- base: `marketing_campaign_daily_performance`
- granularidade: `campaign/day`
- continua existindo
- continua atendendo fluxos legados

Trilha nova:

- base: `marketing_ad_daily_performance`
- granularidade: `ad/day`
- foco: Dashboard de Lançamentos
- leitura via endpoints próprios em `GET /marketing-dashboard/*`

## 2. Objetivo

O backend do Dashboard de Lançamentos entrega:

- estrutura consolidada por anúncio/dia
- chave oficial de join entre mídia e cadastro
- leitura read-only para cards, gráficos e tabela
- scheduler opcional para atualização horária

Com isso o dashboard passa a suportar:

- resumo consolidado de mídia e cadastros
- série temporal diária
- tabela detalhada por anúncio
- filtros por provider, conta, campanha, adset e anúncio

## 3. Visão geral da arquitetura

Fluxo macro:

1. OAuth conecta Google Ads e Meta Ads.
2. `MarketingSyncService` sincroniza contas acessíveis.
3. Contas selecionadas geram `marketing_extract_job`.
4. Jobs são enfileirados via Azure Service Bus ou processados inline em dev.
5. `MarketingExtractProcessorService` salva raw em `marketing_extract_raw`.
6. O processor continua escrevendo o consolidado legado `marketing_campaign_daily_performance`.
7. Em paralelo, quando o payload já contém granularidade de anúncio, o processor escreve `marketing_ad_daily_performance`.
8. O `LeadPersistenceService` persiste `capture.external_ad_id` a partir de `payload.utms.h_ad_id`.
9. O módulo `marketing-dashboard` lê mídia e cadastro separadamente e consolida a resposta dos endpoints.
10. O scheduler opcional cria/reenfileira jobs de `today` a cada hora.

### Relação com o backoffice

O backoffice deve consumir somente os endpoints read-only do módulo `marketing-dashboard`:

- `GET /marketing-dashboard/summary`
- `GET /marketing-dashboard/timeseries`
- `GET /marketing-dashboard/table`

Eles foram desenhados para evitar join detalhado entre mídia e cadastro e para permanecer independentes da trilha legada.

## 4. Componentes e tabelas principais

### 4.1 Tabelas legadas

- `oauth_connection`
- `oauth_state`
- `marketing_connection_account`
- `marketing_extract_job`
- `marketing_extract_raw`
- `marketing_campaign_daily_performance`
- `capture`

### 4.2 Tabelas novas

- `marketing_ad_daily_performance`
- `marketing_sync_configuration`

Campos principais:

- `provider`
- `external_account_id`
- `account_name`
- `external_campaign_id`
- `campaign_name`
- `external_adset_id`
- `adset_name`
- `external_ad_id`
- `ad_name`
- `report_date`
- `impressions`
- `clicks`
- `spend`
- `conversions`
- `metadata`

Índice único principal:

- `provider + external_account_id + external_ad_id + report_date`

### 4.3 Entidades principais

- `MarketingConnectionAccount`
- `MarketingExtractJob`
- `MarketingExtractRaw`
- `MarketingCampaignDailyPerformance`
- `MarketingAdDailyPerformance`
- `Capture`

### 4.4 Services e módulos principais

- `OauthModule`
- `MarketingSyncModule`
- `MarketingSyncService`
- `MarketingExtractProcessorService`
- `MarketingSyncConsumer`
- `MarketingDashboardSchedulerService`
- `MarketingDashboardModule`
- `MarketingDashboardService`
- `LeadPersistenceService`

### 4.5 Configuração persistida de sync

O projeto agora também possui uma tabela própria para configuração persistida de sync:

- `marketing_sync_configuration`

Finalidade:

- guardar configuração operacional de sync no banco
- expor configuração para backoffice
- preparar a migração gradual de parâmetros hoje dependentes de env para configuração administrável

Campos principais:

- `sync_key`
- `provider`
- `enabled`
- `schedule_enabled`
- `schedule_interval_minutes`
- `config`
- `metadata`

Observação importante:

- o runtime atual ainda não foi totalmente replugado para depender desta tabela
- neste momento ela já serve como fonte oficial de configuração persistida e API de administração

## 5. Configuração e pré-requisitos

### Envs relevantes

API:

- `API_KEY_ENABLED`
- `INTERNAL_API_KEY`

Banco:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`

Service Bus:

- `SERVICE_BUS_CONNECTION_STRING`
- `SERVICE_BUS_ENABLED`
- `SERVICE_BUS_MARKETING_EXTRACT_QUEUE`
- `SERVICE_BUS_MARKETING_EXTRACT_CONSUMER_ENABLED`
- `SERVICE_BUS_MARKETING_EXTRACT_MAX_CONCURRENCY`

Google Ads OAuth:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
- `GOOGLE_ADS_OAUTH_REDIRECT_URI`
- `GOOGLE_ADS_OAUTH_SCOPES`

Meta OAuth:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_CONFIG_ID`
- `META_OAUTH_REDIRECT_URI`
- `META_OAUTH_SCOPES`
- `META_API_VERSION`

Scheduler do dashboard:

- `MARKETING_DASHBOARD_SCHEDULER_ENABLED`
- `MARKETING_DASHBOARD_SCHEDULER_INTERVAL_MINUTES`

Persistência de configuração:

- a configuração de sync agora pode ser salva via `marketing_sync_configuration`
- o scheduler já usa essa tabela como fonte preferencial
- credenciais sensíveis e infraestrutura base ainda permanecem em env

### Flags importantes

- `MARKETING_DASHBOARD_SCHEDULER_ENABLED=false` por padrão
- `SERVICE_BUS_ENABLED=false` permite fallback inline
- `SERVICE_BUS_MARKETING_EXTRACT_CONSUMER_ENABLED=false` desliga o consumer de fila

### Migrations

Garanta que as migrations estejam aplicadas:

```bash
npm run migration:run
```

A migration crítica da nova trilha é:

- `1770000000038-CreateMarketingAdDailyPerformance.ts`

### Build

Validação básica:

```bash
npm run build
```

### Como subir localmente

1. Configurar `.env.local` ou `.env`
2. Subir PostgreSQL
3. Aplicar migrations
4. Rodar build
5. Subir a aplicação

Exemplo:

```bash
npm run migration:run
npm run build
npm run start:dev
```

### Como validar o ambiente

- OAuths configurados
- banco acessível
- migrations aplicadas
- consumer ligado ou fallback inline esperado
- contas de marketing sincronizadas e selecionadas

## 6. Fluxo completo passo a passo

### 1. Conectar provider

Conectar Google Ads e/ou Meta Ads pelos fluxos OAuth já existentes.

Docs base preservadas:

- `docs/oauth-google-ads.md`
- `docs/oauth-meta-ads.md`

### 2. Sincronizar contas

Endpoints operacionais:

- `POST /marketing-sync/accounts/refresh`
- `POST /marketing-sync/connections/:connectionId/accounts/refresh`
- `GET /marketing-sync/accounts`
- `PATCH /marketing-sync/accounts/:accountId/selection`

### 2.1 Configurar syncs persistidos

Endpoints operacionais:

- `GET /marketing-sync/configurations`
- `POST /marketing-sync/configurations`

Uso:

- listar syncs configurados
- habilitar/desabilitar sync
- habilitar/desabilitar scheduler
- salvar `scheduleIntervalMinutes`
- guardar `config` e `metadata` livres para operação/admin

### 3. Selecionar contas

Somente contas com:

- `selected = true`
- `status = active`

participam da criação automática de jobs.

### 4. Criar, enfileirar e processar jobs

Endpoints operacionais:

- `POST /marketing-sync/jobs/daily`
- `GET /marketing-sync/jobs`
- `POST /marketing-sync/jobs/:jobId/enqueue`
- `POST /marketing-sync/jobs/:jobId/process`

Fila:

- usa `SERVICE_BUS_MARKETING_EXTRACT_QUEUE`
- consumer em `MarketingSyncConsumer`
- fallback inline quando o Service Bus está desabilitado

### 5. Persistir raw

Cada linha extraída do provider é salva em:

- `marketing_extract_raw`

Consulta operacional:

- `GET /marketing-sync/raw`

### 6. Persistir campanha/dia legado

O processor continua escrevendo normalmente em:

- `marketing_campaign_daily_performance`

Consulta operacional:

- `GET /marketing-sync/performance`

### 7. Persistir anúncio/dia novo

O processor já está preparado para escrita paralela em:

- `marketing_ad_daily_performance`

Mas essa escrita só ocorre quando o payload já tem granularidade de anúncio.

Estado atual do código:

- Meta grava `ad/day` quando houver `row.ad_id`
- Google grava `ad/day` quando houver `row.adGroupAd?.ad?.id`

Se o payload ainda vier em `campaign/day`, a trilha nova permanece sem linhas, mas a legada continua funcionando.

### 8. Preencher `capture.external_ad_id`

O `LeadPersistenceService` já implementa:

- `external_ad_id = payload.utms.h_ad_id`
- `ad_id = extractAdIdFromUtmContent(utm_content)`

Regras:

- `external_ad_id` é a chave oficial futura de join
- `ad_id` continua como compatibilidade temporária
- não há cópia automática de `ad_id` para `external_ad_id`

### 9. Ler endpoints do dashboard

Cards:

- `GET /marketing-dashboard/summary`

Gráficos:

- `GET /marketing-dashboard/timeseries`

Tabela:

- `GET /marketing-dashboard/table`

### 10. Atualizar periodicamente via scheduler

O scheduler é opcional e focado em `today`.

Fonte de configuração do scheduler:

1. primeiro tenta `marketing_sync_configuration` com:
   - `sync_key = marketing_extract`
   - `provider IS NULL`
2. se não encontrar configuração persistida, usa fallback por env:
   - `MARKETING_DASHBOARD_SCHEDULER_ENABLED`
   - `MARKETING_DASHBOARD_SCHEDULER_INTERVAL_MINUTES`

Fluxo:

1. seleciona contas ativas
2. verifica job de hoje por conta
3. cria job se não existir
4. reenfileira somente jobs `failed` ou `completed`
5. ignora `pending` e `running`

## 7. Modelagem e regras de negócio

### 7.1 Trilha legada `campaign/day`

- tabela: `marketing_campaign_daily_performance`
- granularidade: campanha/dia
- continua sendo escrita
- continua atendendo usos legados

### 7.2 Trilha nova `ad/day`

- tabela: `marketing_ad_daily_performance`
- granularidade: anúncio/dia
- unificada por provider
- `provider` discrimina Google e Meta

### 7.3 Chave oficial de join

Join oficial:

- `capture.external_ad_id = marketing_ad_daily_performance.external_ad_id`

Essa é a chave canônica de anúncio do dashboard.

### 7.4 Compatibilidade com `ad_id`

`capture.ad_id`:

- continua existindo
- continua sendo preenchido por `utm_content`
- não é a chave oficial
- deve ser tratado como compatibilidade temporária

### 7.5 Papel de `metadata`

`metadata` deve guardar:

- payloads auxiliares
- campos específicos de provider
- contexto técnico de extração

`metadata` não deve substituir:

- `external_ad_id`
- `report_date`
- `spend`
- `clicks`
- `impressions`
- demais colunas usadas em filtro e agregação

### 7.6 Limitações conhecidas

- a trilha `ad/day` depende do payload dos providers já trazer granularidade de anúncio
- se `marketing_ad_daily_performance` estiver vazia, os endpoints do dashboard responderão vazio ou zerado
- `registrations` dependem de `capture.external_ad_id` chegar no payload real
- filtros de campanha/adset no lado cadastro são refletidos indiretamente via subquery de `external_ad_id`

## 8. Manual de operação

### Como rodar migrations

```bash
npm run migration:run
```

### Como validar se a nova trilha está povoada

Verifique:

- existência de jobs executados com sucesso
- presença de raw com payload de anúncio
- presença de linhas em `marketing_ad_daily_performance`

Consultas úteis:

- `GET /marketing-sync/jobs`
- `GET /marketing-sync/raw`

### Como testar endpoints

Com `INTERNAL_API_KEY`:

```bash
curl -H "x-api-key: change-me" "http://localhost:3000/marketing-dashboard/summary?dateFrom=2026-04-01&dateTo=2026-04-16"
```

### Como verificar scheduler

Envs:

- `MARKETING_DASHBOARD_SCHEDULER_ENABLED=true`
- `MARKETING_DASHBOARD_SCHEDULER_INTERVAL_MINUTES=60`

Configuração persistida equivalente:

```json
{
  "syncKey": "marketing_extract",
  "enabled": true,
  "scheduleEnabled": true,
  "scheduleIntervalMinutes": 60,
  "config": {
    "provider": "meta_ads"
  }
}
```

O scheduler:

- não roda imediatamente no startup
- recarrega a configuração a cada ciclo
- usa `marketing_sync_configuration` como override quando existir
- registra logs de execução e skip

### Como verificar jobs

Use:

- `GET /marketing-sync/jobs`

Procure por:

- `preset=today`
- `status=pending|running|completed|failed`
- metadado `scheduler=hourly`

### Como verificar configurações persistidas de sync

Use:

- `GET /marketing-sync/configurations`

Exemplos:

```bash
curl -H "x-api-key: change-me" "http://localhost:3000/marketing-sync/configurations"
curl -H "x-api-key: change-me" "http://localhost:3000/marketing-sync/configurations?syncKey=marketing_extract"
curl -H "x-api-key: change-me" "http://localhost:3000/marketing-sync/configurations?provider=meta_ads"
```

### Como verificar fallback inline/dev

Se `SERVICE_BUS_ENABLED=false`, o serviço:

- não publica na fila
- cai no processamento inline já existente

### Como validar consistência entre mídia e cadastro

Checklist:

1. `marketing_ad_daily_performance.external_ad_id` existe nas linhas esperadas
2. `capture.external_ad_id` está sendo preenchido
3. o intervalo de datas cobre mídia e cadastro
4. `launchId` e `seasonId` filtram apenas o lado `capture`

## 9. Endpoints do dashboard

Todos os endpoints são:

- read-only
- protegidos por `ApiKeyGuard`
- agrupados em `Controller('marketing-dashboard')`

### 9.0 `GET /marketing-dashboard/filters`

Objetivo:

- retornar em um payload único as opções dos selects do dashboard

Query params:

- `provider` opcional
- `externalAccountId` opcional
- `externalCampaignId` opcional
- `externalAdsetId` opcional
- `externalAdId` opcional
- `dateFrom` opcional
- `dateTo` opcional
- `launchId` opcional
- `seasonId` opcional

Validações:

- `dateFrom` e `dateTo` devem ser enviados juntos
- quando enviados, devem estar no formato `YYYY-MM-DD`

Comportamento:

- retorna opções de:
  - `providers`
  - `accounts`
  - `campaigns`
  - `adsets`
  - `ads`
  - `launches`
  - `seasons`
- usa a própria base do dashboard para restringir os resultados
- pode ser usado para encadear selects no front

Exemplo de request:

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/filters?provider=meta_ads&dateFrom=2026-01-20&dateTo=2026-03-16"
```

Exemplo de response:

```json
{
  "filters": {
    "provider": "meta_ads",
    "externalAccountId": null,
    "externalCampaignId": null,
    "externalAdsetId": null,
    "externalAdId": null,
    "dateFrom": "2026-01-20",
    "dateTo": "2026-03-16",
    "launchId": null,
    "seasonId": null
  },
  "options": {
    "providers": [
      { "value": "meta_ads", "label": "meta_ads" }
    ],
    "accounts": [
      { "value": "seed_meta_i55_ca55_oro_frios_02", "label": "I55 - CA55 - ORO frios 02" }
    ],
    "campaigns": [],
    "adsets": [],
    "ads": [],
    "launches": [],
    "seasons": []
  }
}
```

### 9.1 `GET /marketing-dashboard/summary`

Objetivo:

- retornar cards consolidados do dashboard no período

Query params:

- `provider` opcional
- `externalAccountId` opcional
- `externalCampaignId` opcional
- `externalAdsetId` opcional
- `externalAdId` opcional
- `dateFrom` obrigatório
- `dateTo` obrigatório
- `launchId` opcional
- `seasonId` opcional

Validações:

- `dateFrom` e `dateTo` obrigatórios
- formato `YYYY-MM-DD`

Comportamento:

- agrega mídia em `marketing_ad_daily_performance`
- agrega `registrations` em `capture`
- usa subquery distinta de `external_ad_id` para evitar multiplicação de linhas

Exemplo de request:

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/summary?provider=meta_ads&dateFrom=2026-04-01&dateTo=2026-04-16"
```

Exemplo de response:

```json
{
  "filters": {
    "provider": "meta_ads",
    "externalAccountId": null,
    "externalCampaignId": null,
    "externalAdsetId": null,
    "externalAdId": null,
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-16",
    "launchId": null,
    "seasonId": null
  },
  "summary": {
    "spend": 1543.25,
    "impressions": 182340,
    "clicks": 4211,
    "conversions": 127,
    "registrations": 98,
    "cpc": 0.366494,
    "ctr": 0.023095,
    "cpm": 8.4632,
    "cpl": 15.747449
  }
}
```

Observações:

- métricas derivadas retornam `null` quando a base de cálculo é zero
- se não houver dados em `marketing_ad_daily_performance`, a resposta tende a zerar mídia e cadastros vinculados

### 9.2 `GET /marketing-dashboard/timeseries`

Objetivo:

- retornar série temporal diária para gráficos

Query params:

- mesmos do `summary`

Validações:

- `dateFrom` e `dateTo` obrigatórios
- formato `YYYY-MM-DD`

Comportamento:

- mídia agregada por `report_date`
- cadastros agregados por `DATE(COALESCE(capture.occurred_at, capture.created_at))`
- dias sem dados são preenchidos no intervalo

Exemplo de request:

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/timeseries?provider=google_ads&externalCampaignId=987654321&dateFrom=2026-04-01&dateTo=2026-04-07"
```

Exemplo de response:

```json
{
  "filters": {
    "provider": "google_ads",
    "externalAccountId": null,
    "externalCampaignId": "987654321",
    "externalAdsetId": null,
    "externalAdId": null,
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-07",
    "launchId": null,
    "seasonId": null
  },
  "timeseries": [
    {
      "date": "2026-04-01",
      "spend": 120.5,
      "impressions": 10234,
      "clicks": 203,
      "conversions": 6,
      "registrations": 4,
      "cpc": 0.593596,
      "ctr": 0.019836,
      "cpm": 11.774477,
      "cpl": 30.125
    },
    {
      "date": "2026-04-02",
      "spend": 0,
      "impressions": 0,
      "clicks": 0,
      "conversions": 0,
      "registrations": 0,
      "cpc": null,
      "ctr": null,
      "cpm": null,
      "cpl": null
    }
  ]
}
```

Observações:

- os dias do intervalo sempre aparecem
- `registrations` dependem de `capture.external_ad_id`

### 9.3 `GET /marketing-dashboard/table`

Objetivo:

- retornar a tabela principal do dashboard, agregada por anúncio no período

Query params:

- filtros base do `summary`
- `page` opcional, default `1`
- `pageSize` opcional, default `25`, máximo `100`
- `sortBy` opcional
- `sortOrder` opcional: `asc` ou `desc`

Whitelist de ordenação:

- `spend`
- `impressions`
- `clicks`
- `conversions`
- `registrations`
- `cpc`
- `ctr`
- `cpm`
- `cpl`
- `campaignName`
- `adsetName`
- `adName`

Default de ordenação:

- `sortBy=spend`
- `sortOrder=desc`

Comportamento:

- mídia agregada por `external_ad_id`
- cadastro agregado por `capture.external_ad_id`
- merge em memória
- paginação e ordenação em memória no MVP

Exemplo de request:

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/table?provider=meta_ads&dateFrom=2026-04-01&dateTo=2026-04-16&page=1&pageSize=25&sortBy=spend&sortOrder=desc"
```

Exemplo de response:

```json
{
  "filters": {
    "provider": "meta_ads",
    "externalAccountId": null,
    "externalCampaignId": null,
    "externalAdsetId": null,
    "externalAdId": null,
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-16",
    "launchId": null,
    "seasonId": null
  },
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 2,
    "totalPages": 1
  },
  "sort": {
    "sortBy": "spend",
    "sortOrder": "desc"
  },
  "items": [
    {
      "provider": "meta_ads",
      "externalAccountId": "123456789",
      "accountName": "Conta Lancamento A",
      "externalCampaignId": "987654321",
      "campaignName": "Campanha A",
      "externalAdsetId": "555555",
      "adsetName": "Adset A",
      "externalAdId": "999999",
      "adName": "Criativo A",
      "spend": 845.12,
      "impressions": 90213,
      "clicks": 1764,
      "conversions": 52,
      "registrations": 41,
      "cpc": 0.479093,
      "ctr": 0.019554,
      "cpm": 9.368726,
      "cpl": 20.612683
    }
  ]
}
```

Observações:

- `registrations` volta `0` quando não houver captura vinculada para aquele anúncio
- paginação e ordenação são do resultado consolidado já montado

## 10. Payloads e contratos

### `summary`

Estrutura:

- `filters`
- `summary`

`summary`:

- `spend: number`
- `impressions: number`
- `clicks: number`
- `conversions: number`
- `registrations: number`
- `cpc: number | null`
- `ctr: number | null`
- `cpm: number | null`
- `cpl: number | null`

### `timeseries`

Estrutura:

- `filters`
- `timeseries: Array<{...}>`

Cada linha:

- `date: string`
- `spend: number`
- `impressions: number`
- `clicks: number`
- `conversions: number`
- `registrations: number`
- `cpc: number | null`
- `ctr: number | null`
- `cpm: number | null`
- `cpl: number | null`

### `table`

Estrutura:

- `filters`
- `pagination`
- `sort`
- `items`

Cada item:

- `provider`
- `externalAccountId`
- `accountName`
- `externalCampaignId`
- `campaignName`
- `externalAdsetId`
- `adsetName`
- `externalAdId`
- `adName`
- `spend`
- `impressions`
- `clicks`
- `conversions`
- `registrations`
- `cpc`
- `ctr`
- `cpm`
- `cpl`

### Datas

- entrada: `YYYY-MM-DD`
- `dateTo` é inclusivo no lado mídia
- no lado cadastro, o filtro usa intervalo `[dateFrom 00:00Z, nextDay(dateTo) 00:00Z)`

### Nullability de métricas

Retornam `null` quando há divisão por zero:

- `cpc`
- `ctr`
- `cpm`
- `cpl`

### Paginação e ordenação da tabela

Defaults:

- `page=1`
- `pageSize=25`
- `sortBy=spend`
- `sortOrder=desc`

Max:

- `pageSize=100`

Whitelist:

- `spend`
- `impressions`
- `clicks`
- `conversions`
- `registrations`
- `cpc`
- `ctr`
- `cpm`
- `cpl`
- `campaignName`
- `adsetName`
- `adName`

### `filters`

Estrutura:

- `filters`
- `options`

`options`:

- `providers: Array<{ value: string; label: string }>`
- `accounts: Array<{ value: string; label: string | null }>`
- `campaigns: Array<{ value: string; label: string | null }>`
- `adsets: Array<{ value: string; label: string | null }>`
- `ads: Array<{ value: string; label: string | null }>`
- `launches: Array<{ value: string; label: string }>`
- `seasons: Array<{ value: string; label: string }>`

## 11. Validações e regras importantes

- `dateFrom` e `dateTo` são obrigatórios nos endpoints do dashboard
- o join oficial usa `capture.external_ad_id`
- não existe join detalhado direto entre `capture` e `marketing_ad_daily_performance`
- filtros de mídia são aplicados no lado `marketing_ad_daily_performance`
- filtros de `launchId` e `seasonId` são aplicados no lado `capture`
- filtros de conta/campanha/adset/anúncio no lado cadastro acontecem indiretamente via subquery de `external_ad_id`
- sem povoamento da trilha `ad/day`, o dashboard não terá dados úteis
- `ad_id` não deve ser usado como join principal

## 12. Como implementar no backoffice

### Ordem recomendada de consumo

1. chamar `filters`
2. chamar `summary`
3. chamar `timeseries`
4. chamar `table`

Usar exatamente o mesmo conjunto de filtros base.

### Estrutura sugerida do backoffice

Cards:

- consumir `summary`
- exibir `spend`, `impressions`, `clicks`, `conversions`, `registrations`, `cpl`

Gráficos:

- consumir `timeseries`
- usar `date` no eixo X
- plotar mídia e registros em séries separadas

Tabela:

- consumir `table`
- usar paginação server-side simples com `page` e `pageSize`
- usar ordenação server-side com `sortBy` e `sortOrder`

### Filtros que o front deve enviar

Sempre enviar:

- `dateFrom`
- `dateTo`

Opcionalmente:

- `provider`
- `externalAccountId`
- `externalCampaignId`
- `externalAdsetId`
- `externalAdId`
- `launchId`
- `seasonId`

### Como implementar os selects no backoffice

Fluxo recomendado:

1. inicializar a tela com um intervalo padrão
2. chamar `GET /marketing-dashboard/filters`
3. preencher os selects com `options`
4. ao mudar um filtro, rechamar `filters` com o estado atual
5. depois atualizar `summary`, `timeseries` e `table`

Mapeamento sugerido:

- `Provider` <- `options.providers`
- `Conta` <- `options.accounts`
- `Campanha` <- `options.campaigns`
- `Adset` <- `options.adsets`
- `Anúncio` <- `options.ads`
- `Launch` <- `options.launches`
- `Season` <- `options.seasons`

Exemplo de sequência:

```ts
await fetchFilters(filters);
await Promise.all([
  fetchSummary(filters),
  fetchTimeseries(filters),
  fetchTable(filters),
]);
```

Para filtros encadeados:

```ts
const nextFilters = { ...filters, provider: 'meta_ads' };
await fetchFilters(nextFilters);
```

### Como lidar com estados vazios

- `summary` pode vir zerado
- `timeseries` pode vir com dias zerados
- `table.items` pode vir vazio com `total=0`

O front deve tratar isso como ausência de dado, não como erro de API.

### Como lidar com métricas `null`

Para:

- `cpc`
- `ctr`
- `cpm`
- `cpl`

mostrar:

- `-`
- `N/A`
- ou estado visual equivalente

Nunca assumir `0` para esconder divisão por zero.

### Como paginar e ordenar a tabela

Paginação:

- controlar `page` e `pageSize`
- usar `pagination.total` e `pagination.totalPages`

Ordenação:

- restringir a UI aos campos da whitelist
- não enviar `sortBy` arbitrário

### Como interpretar limitações atuais

- se `registrations` estiver zerado, pode ser ausência real ou falta de `external_ad_id` no capture
- se mídia estiver zerada, pode ser falta de povoamento do `marketing_ad_daily_performance`
- filtros de campanha/adset no lado cadastro não são nativos; vêm do lado mídia por subquery

### Como preparar futura expansão

O módulo já está preparado para receber:

- endpoint de detalhamento por anúncio
- endpoint por campanha/adset
- segmentações adicionais
- otimização SQL da tabela quando o volume crescer

## 13. Exemplos práticos

### Exemplo de fluxo local

1. subir app e banco
2. aplicar migrations
3. sincronizar contas
4. selecionar conta
5. criar jobs
6. processar jobs
7. validar `capture.external_ad_id`
8. consumir endpoints do dashboard

### Exemplo de filtro por provider

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/summary?provider=meta_ads&dateFrom=2026-04-01&dateTo=2026-04-16"
```

### Exemplo de filtro por campanha

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/timeseries?externalCampaignId=987654321&dateFrom=2026-04-01&dateTo=2026-04-16"
```

### Exemplo de filtro por anúncio

```bash
curl -H "x-api-key: change-me" \
  "http://localhost:3000/marketing-dashboard/table?externalAdId=999999&dateFrom=2026-04-01&dateTo=2026-04-16"
```

### Exemplo de leitura do summary

Use para cards do topo.

### Exemplo de leitura do timeseries

Use para gráfico diário de spend, clicks e registrations.

### Exemplo de leitura da tabela

Use para listagem operacional com paginação.

### Exemplo de leitura do filters

Use para montar todos os selects do topo da tela antes das consultas analíticas.

## 14. Troubleshooting

### `marketing_ad_daily_performance` vazia

Verifique:

- jobs executaram?
- provider já retornou granularidade de anúncio?
- processor encontrou `ad_id` ou `adGroupAd.ad.id`?

### `registrations` zerados

Verifique:

- `capture.external_ad_id` está sendo preenchido?
- `payload.utms.h_ad_id` está chegando?
- `launchId` ou `seasonId` não estão filtrando demais?

### `external_ad_id` não preenchido

Verifique:

- payload real do lead registration
- presença de `utms.h_ad_id`
- persistência em `LeadPersistenceService`

### Scheduler não executa

Verifique:

- `MARKETING_DASHBOARD_SCHEDULER_ENABLED=true`
- logs de startup
- `MARKETING_DASHBOARD_SCHEDULER_INTERVAL_MINUTES`

### Job não entra na fila

Verifique:

- `SERVICE_BUS_ENABLED`
- `SERVICE_BUS_CONNECTION_STRING`
- `SERVICE_BUS_MARKETING_EXTRACT_QUEUE`
- consumer habilitado

### Build falha

Rodar:

```bash
npm run build
```

Revisar DTOs, imports e entities registradas.

### Endpoint retorna vazio

Verifique:

- intervalo de datas
- filtros enviados
- se a trilha `ad/day` já está populada

### Discrepância entre mídia e cadastro

Possíveis causas:

- `capture.external_ad_id` ausente
- diferença de período entre `report_date` e `occurred_at/created_at`
- filtros de `launchId` e `seasonId`
- atraso de atualização dos jobs

## 15. Checklist final de operação

- migrations aplicadas
- entity `MarketingAdDailyPerformance` carregada
- processor com branch paralelo ativo
- provider entregando payload `ad/day`
- `capture.external_ad_id` sendo preenchido
- scheduler configurado quando desejado
- endpoints `summary`, `timeseries` e `table` respondendo
- backoffice preparado para consumir os três endpoints

## 16. Pendências e próximos passos

MVP atual:

- leitura do dashboard pronta
- scheduler horário opcional pronto
- trilha `ad/day` pronta no backend

Pendências dependentes de dado real:

- garantir povoamento consistente de `marketing_ad_daily_performance`
- validar volume e qualidade de `capture.external_ad_id`
- confirmar cobertura dos providers em `ad/day`

Otimizações futuras:

- mover paginação/ordenação da tabela para SQL se o volume crescer
- ampliar detalhamento por anúncio/adset/campanha
- adicionar observabilidade específica para o scheduler
- expandir validações analíticas de consistência mídia x cadastro
