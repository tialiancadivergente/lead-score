# Extracao de Marketing MVP

## Objetivo

Definir o fluxo minimo para:

- manter a lista de contas Google Ads e Meta Ads atualizada
- extrair metricas diariamente
- popular uma camada inicial de dados para uso analitico

Este documento descreve o desenho de MVP para validar com produto antes da implementacao.

## Status atual

Implementado nesta etapa:

- tabelas de contas sincronizadas, jobs, raw e performance diaria
- modulo `marketing-sync`
- sincronizacao manual de contas por conexao ou por provider
- selecao de contas para monitoramento
- criacao de jobs diarios de extracao
- enfileiramento via Azure Service Bus seguindo o padrao do projeto
- consumer para processar jobs em background
- extracao inicial de `campaign daily` para Google Ads
- extracao inicial de `campaign daily` para Meta Ads
- persistencia em staging (`marketing_extract_raw`)
- consolidacao inicial em `marketing_campaign_daily_performance`

Ainda pendente nesta fase:

- agendamento diario automatico por cron/orquestrador
- endpoint de detalhe individual dos jobs
- retries mais sofisticados
- extracao assincrona da Meta com report run + polling
- importacao historica inicial apos conexao
- criptografia de tokens OAuth

## Env operacional

Ja adicionados para a fila de extracao:

```env
SERVICE_BUS_MARKETING_EXTRACT_QUEUE=marketing-extract
SERVICE_BUS_MARKETING_EXTRACT_CONSUMER_ENABLED=true
SERVICE_BUS_MARKETING_EXTRACT_MAX_CONCURRENCY=3
```

Observacoes:

- esses envs seguem o mesmo padrao do restante do projeto
- o consumer depende do Azure Service Bus ja configurado
- ainda nao existe env de cron porque o agendamento automatico ainda nao foi implementado
- em ambiente local, se o Service Bus estiver desabilitado, o job pode ser processado inline para facilitar validacao

## Escopo do MVP

O MVP proposto cobre:

- conexao OAuth de Google Ads e Meta Ads
- descoberta diaria de contas acessiveis por conexao
- selecao de contas que serao monitoradas
- extracao diaria automatica
- janela minima de dados: `yesterday`
- opcionalmente, extracao parcial de `today`
- granularidade inicial: `campaign daily`

Nao cobre neste primeiro momento:

- extracao completa em nivel de ad, adset, asset e keyword
- reconciliacao avancada de historico
- dashboards finais
- regras complexas de retry e observabilidade
- modelagem final de BI

## Visao geral do fluxo

1. O usuario conecta Google Ads ou Meta Ads
2. O sistema salva a conexao OAuth
3. Todo dia pela manha, o sistema revalida as contas acessiveis dessa conexao
4. O sistema atualiza a tabela local de contas e subcontas
5. O sistema identifica quais contas estao marcadas para monitoramento
6. Para cada conta selecionada, o sistema cria um job de extracao
7. O job busca os dados do periodo desejado
8. O resultado bruto e salvo em staging
9. Os dados sao consolidados em tabelas de performance diaria

## Separacao das rotinas

### 1. Descoberta de contas

Objetivo:

- manter atualizada a lista de contas, ad accounts e subaccounts acessiveis por conexao

Quando executar:

- 1x por dia pela manha
- sob demanda, quando o usuario clicar em atualizar contas

O que faz:

- busca conexoes ativas
- lista contas acessiveis por provider
- atualiza contas novas
- marca contas antigas como nao vistas/indisponiveis quando necessario
- preserva a marcacao das contas selecionadas para extracao
- contas com falha de validacao operacional podem entrar como `restricted`, apenas para rastreabilidade

### 2. Extracao de metricas

Objetivo:

- buscar dados diarios das contas selecionadas

Janela minima do MVP:

- `yesterday`

Janela opcional:

- `today` como parcial do dia atual

Regra recomendada:

- `yesterday` obrigatorio
- `today` apenas se produto quiser visao parcial no mesmo dia

### 3. Processamento assincrono

Objetivo:

- desacoplar a extracao do request HTTP e controlar o estado de execucao

Regra sugerida:

- toda extracao vira um job
- jobs podem ficar em `pending`, `running`, `completed` ou `failed`
- o resultado bruto sempre vai primeiro para staging

## Diferenca pratica entre Google e Meta

### Google Ads

No MVP, o mais simples e:

- consultar de forma sincrona por conta e data
- salvar o retorno
- consolidar

Nao precisa começar com mecanismo complexo de lote, salvo se o volume ja nascer alto.

### Meta Ads

Desenho ideal:

- criar solicitacao de relatorio
- receber um identificador de job da Meta
- fazer polling do status
- quando concluir, baixar o resultado
- salvar em staging
- consolidar

Resumo:

- Google: simples primeiro
- Meta: idealmente assicrono com polling

Status atual da implementacao:

- Google esta sendo extraido de forma direta
- Meta tambem esta sendo extraida de forma direta por `insights`
- o fluxo assincrono da Meta continua como proxima evolucao

## O que puxar no MVP

Comecar com o minimo comum e util:

- data
- provider
- conta
- campaign id
- campaign name
- impressions
- clicks
- spend
- conversions ou leads, quando disponivel

Granularidade recomendada:

- `campaign daily`

Nao comecar com:

- ad level
- adset level
- keyword level
- asset level

Isso reduz risco e complexidade.

## Tabelas sugeridas

### 1. `marketing_connection_account`

Responsabilidade:

- guardar as contas descobertas por conexao

Campos sugeridos:

- `id`
- `oauth_connection_id`
- `provider`
- `external_account_id`
- `external_account_name`
- `parent_external_account_id`
- `is_manager`
- `status`
- `selected`
- `last_seen_at`
- `metadata`
- `created_at`
- `updated_at`

Uso:

- representa as contas acessiveis hoje
- permite marcar quais contas devem ser monitoradas

### 2. `marketing_extract_job`

Responsabilidade:

- controlar execucoes de extracao

Campos sugeridos:

- `id`
- `provider`
- `oauth_connection_id`
- `external_account_id`
- `date_from`
- `date_to`
- `preset`
- `status`
- `requested_at`
- `started_at`
- `completed_at`
- `error_message`
- `metadata`

Uso:

- controla o ciclo do job
- permite polling, retry e auditoria

### 3. `marketing_extract_raw`

Responsabilidade:

- guardar o payload bruto retornado pelo provider

Campos sugeridos:

- `id`
- `job_id`
- `provider`
- `external_account_id`
- `report_date`
- `payload`
- `created_at`

Uso:

- staging tecnica
- facilita reprocessamento
- reduz risco de perder dados em caso de erro na consolidacao

### 4. `marketing_campaign_daily_performance`

Responsabilidade:

- tabela consolidada do MVP

Campos sugeridos:

- `id`
- `provider`
- `external_account_id`
- `external_campaign_id`
- `campaign_name`
- `report_date`
- `impressions`
- `clicks`
- `spend`
- `conversions`
- `metadata`
- `created_at`
- `updated_at`

Uso:

- camada inicial pronta para consumo

## Passo a passo tecnico recomendado

### Fase 1. Sincronizacao de contas

1. listar conexoes OAuth ativas
2. para cada conexao, consultar contas acessiveis
3. atualizar `marketing_connection_account`
4. preservar a marcacao `selected`
5. registrar `last_seen_at`

### Fase 2. Selecao de contas

1. exibir contas descobertas para o usuario
2. permitir marcar 1 ou mais contas como ativas para extracao
3. salvar em `marketing_connection_account.selected`

### Fase 3. Agendamento diario

1. rodar job diario pela manha
2. buscar contas `selected = true`
3. criar um `marketing_extract_job` por conta e por periodo
4. periodo obrigatorio: `yesterday`
5. periodo opcional: `today`

### Fase 4. Extracao Google

1. pegar job `pending`
2. consultar Google Ads para a conta e data
3. salvar payload em `marketing_extract_raw`
4. consolidar em `marketing_campaign_daily_performance`
5. marcar job como `completed`

### Fase 5. Extracao Meta

Implementacao atual:

1. pegar job `pending`
2. consultar `insights` diretamente por conta e periodo
3. salvar payload em `marketing_extract_raw`
4. consolidar em `marketing_campaign_daily_performance`
5. marcar job como `completed`

Evolucao planejada:

1. criar relatorio assicrono na Meta
2. salvar identificador do job externo em `metadata`
3. fazer polling periodico
4. quando concluir, baixar o resultado
5. salvar payload em `marketing_extract_raw`
6. consolidar em `marketing_campaign_daily_performance`
7. marcar job como `completed`

## Politica de datas do MVP

Recomendacao:

- por padrao, extrair `yesterday`

Opcional:

- extrair tambem `today`, deixando claro que se trata de valor parcial

Motivo:

- `yesterday` reduz instabilidade e retrabalho
- `today` muda durante o dia e pode gerar ruido

## Recomendacao de rollout

Ordem ideal:

1. sincronizacao diaria de contas
2. selecao de contas pelo usuario
3. extracao de `yesterday`
4. consolidacao em `campaign daily`
5. adicionar `today` se produto realmente precisar
6. evoluir granularidade depois

## Endpoints implementados

Todos os endpoints abaixo usam o padrao interno do projeto e devem respeitar `x-api-key` quando `API_KEY_ENABLED=true`.

### Sincronizar contas por provider

```bash
curl -X POST "http://localhost:3000/marketing-sync/accounts/refresh?provider=google_ads" \
  -H "x-api-key: SUA_API_KEY"
```

### Sincronizar contas de uma conexao especifica

```bash
curl -X POST "http://localhost:3000/marketing-sync/connections/CONNECTION_UUID/accounts/refresh" \
  -H "x-api-key: SUA_API_KEY"
```

### Listar contas sincronizadas

```bash
curl "http://localhost:3000/marketing-sync/accounts?provider=meta_ads&selected=true" \
  -H "x-api-key: SUA_API_KEY"
```

### Marcar conta para extracao

```bash
curl -X PATCH "http://localhost:3000/marketing-sync/accounts/ACCOUNT_UUID/selection" \
  -H "x-api-key: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "selected": true
  }'
```

Observacao:

- contas com `status = restricted` nao podem ser marcadas para extracao
- elas continuam visiveis na sincronizacao apenas para diagnostico e rastreabilidade

### Criar jobs diarios

```bash
curl -X POST "http://localhost:3000/marketing-sync/jobs/daily" \
  -H "x-api-key: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google_ads",
    "includeToday": false,
    "enqueue": true
  }'
```

Observacao:

- se `SERVICE_BUS_ENABLED=false`, o backend processa o job imediatamente em modo inline para facilitar testes locais

### Listar jobs

```bash
curl "http://localhost:3000/marketing-sync/jobs?provider=google_ads&status=pending" \
  -H "x-api-key: SUA_API_KEY"
```

### Listar payload bruto extraido

```bash
curl "http://localhost:3000/marketing-sync/raw?provider=google_ads&limit=5" \
  -H "x-api-key: SUA_API_KEY"
```

### Listar performance consolidada

```bash
curl "http://localhost:3000/marketing-sync/performance?provider=google_ads&limit=10" \
  -H "x-api-key: SUA_API_KEY"
```

### Enfileirar manualmente um job

```bash
curl -X POST "http://localhost:3000/marketing-sync/jobs/JOB_UUID/enqueue" \
  -H "x-api-key: SUA_API_KEY"
```

### Processar manualmente um job

```bash
curl -X POST "http://localhost:3000/marketing-sync/jobs/JOB_UUID/process" \
  -H "x-api-key: SUA_API_KEY"
```

## Pagina MVP do backend

A pagina improvisada em:

```text
/oauth/google-ads/page
```

agora tambem permite:

- informar a `x-api-key`
- sincronizar contas com `marketing-sync`
- marcar contas para extracao
- criar jobs diarios
- listar e processar jobs
- visualizar o payload bruto extraido
- visualizar a performance consolidada

Importante:

- os endpoints de `marketing-sync` exigem `x-api-key` quando `API_KEY_ENABLED=true`
- por isso a pagina pede a chave manualmente e salva apenas no `localStorage` do navegador para testes
- quando o Service Bus esta desligado, criar job pela pagina pode resultar em processamento imediato

## Onde verificar se os dados chegaram

Depois do processamento, os dados devem aparecer em:

- `marketing_extract_raw`
- `marketing_campaign_daily_performance`

E agora tambem podem ser consultados por endpoint:

- `GET /marketing-sync/raw`
- `GET /marketing-sync/performance`

Leitura pratica:

- `marketing_extract_raw` mostra o payload bruto retornado pelo provider
- `marketing_campaign_daily_performance` mostra a consolidacao em nivel de campanha por dia

## Roadmap tecnico

### Etapa 1. Base estrutural

- [x] criar tabelas de contas sincronizadas
- [x] criar tabelas de jobs, raw e performance diaria
- [x] criar modulo `marketing-sync`

### Etapa 2. Descoberta de contas

- [x] sincronizar contas a partir das conexoes OAuth
- [x] permitir marcar contas para extracao
- [ ] adicionar endpoint de detalhe individual de conta

### Etapa 3. Jobs de extracao

- [x] criar jobs diarios
- [x] enfileirar via Service Bus
- [x] processar jobs em background com consumer
- [ ] adicionar retry controlado por politica

### Etapa 4. Extracao inicial

- [x] Google Ads `campaign daily`
- [x] Meta Ads `campaign daily`
- [ ] Meta assicrono com polling
- [ ] historico inicial apos conexao

### Etapa 5. Operacao

- [ ] agendamento diario automatico
- [ ] sincronizacao manual via UI/admin
- [ ] observabilidade e auditoria mais detalhadas
- [ ] tratamento de revogacao/expiracao de conexoes

## Como colocar isso no backoffice

Fluxo recomendado no backoffice administrativo:

1. listar conexoes OAuth por provider
2. abrir detalhe da conexao
3. mostrar contas acessiveis e contas sincronizadas
4. permitir `Sincronizar contas`
5. permitir marcar/desmarcar contas para extracao
6. permitir `Criar jobs diarios`
7. mostrar status dos jobs e ultimos erros

Chamadas que o backoffice usara:

- `POST /marketing-sync/connections/:connectionId/accounts/refresh`
- `GET /marketing-sync/accounts?provider=...&connectionId=...`
- `PATCH /marketing-sync/accounts/:accountId/selection`
- `POST /marketing-sync/jobs/daily`
- `GET /marketing-sync/jobs?provider=...`

Recomendacao de arquitetura para o backoffice:

- o frontend de admin deve usar autenticacao interna da plataforma
- o backend deve proteger esses endpoints por papel/permissao de admin
- evitar depender de `x-api-key` no browser no produto final

## Perguntas para validar com produto

### Regras de negocio

- o sistema vai monitorar todas as contas acessiveis ou apenas as selecionadas?
- no MVP, o usuario escolhe uma conta ou varias contas?
- subaccounts devem ser monitoradas individualmente?
- queremos so `yesterday` ou tambem `today`?
- `today` deve aparecer como parcial?
- a granularidade inicial sera apenas campanha por dia?

### Dados

- quais metricas sao obrigatorias no MVP?
- conversions e leads sao obrigatorios ou opcionais?
- qual janela historica inicial deve ser importada quando uma conta e conectada?

### Operacao

- a atualizacao sera automatica diaria apenas?
- tambem teremos um botao de `sincronizar agora`?
- o que fazer quando uma conta perder permissao?
- o que fazer quando uma conta deixar de aparecer na sincronizacao de contas?

## Proposta objetiva para validar com produto

Mensagem sugerida:

> Proposta de MVP da extracao:
>
> 1. O usuario conecta Google Ads ou Meta Ads.
> 2. O sistema descobre diariamente quais contas existem nessa conexao.
> 3. O usuario escolhe quais contas devem ser acompanhadas.
> 4. Todo dia pela manha, o sistema puxa automaticamente os dados de `yesterday`.
> 5. Opcionalmente, o sistema tambem pode puxar `today` como parcial.
> 6. No MVP, a extracao sera em nivel de campanha por dia.
> 7. Metricas iniciais propostas: `impressions`, `clicks`, `spend` e `conversions/leads` quando disponiveis.
> 8. Para Meta, a extracao pode rodar em modo assicrono com polling ate conclusao.
> 9. Para Google Ads, inicialmente podemos consultar direto e evoluir depois se necessario.

## Recomendacao final

Para o MVP, a recomendacao mais segura e:

1. sincronizar contas 1x por dia
2. extrair apenas contas selecionadas
3. puxar so `yesterday`
4. consolidar apenas `campaign daily`
5. Meta assincrono com polling
6. Google sincrono inicialmente

Esse recorte ja resolve o essencial sem abrir complexidade demais logo de inicio.
