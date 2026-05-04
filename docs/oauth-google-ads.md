# OAuth Google Ads

## Objetivo

Este recurso cria a base de autenticacao OAuth para conectar contas Google Ads na plataforma.

O backend atual:

- gera a URL de consentimento do Google
- cria e persiste um `state` temporario
- recebe o callback do Google
- troca o `code` por token
- persiste a conexao em banco
- expõe endpoint para consultar conexoes salvas
- lista as contas Google Ads acessiveis com a conexao autenticada
- permite selecionar qual conta Google Ads sera usada pela plataforma
- renova o `access_token` sob demanda quando necessario

## Escopo implementado

Implementado neste momento:

- provider inicial: `google_ads`
- persistencia de `oauth_state`
- persistencia de `oauth_connection`
- pagina MVP no proprio backend para testar o fluxo de ponta a ponta
- endpoint para iniciar autorizacao
- endpoint de callback
- endpoint para listar conexoes salvas
- endpoint para listar contas Google Ads acessiveis pela conexao
- endpoint para selecionar a conta Google Ads da conexao
- refresh on-demand de token para consultas posteriores
- tratamento parcial para contas retornadas pelo Google sem permissao via `login-customer-id`
- documentacao Swagger dos endpoints OAuth

Ainda nao implementado:

- fluxo Meta
- refresh automatico de token
- criptografia de tokens em repouso
- desvincular conexao
- listagem de `oauth_state`
- sincronizacao de contas, campanhas ou metricas
- endpoint de detalhe individual da conexao
- importacao real da estrutura e metricas apos selecionar a conta

## Modelagem criada

### Tabela `oauth_state`

Usada para controlar o ciclo do `state` OAuth.

Campos principais:

- `provider`
- `state`
- `user_id`
- `callback_url`
- `frontend_redirect_url`
- `scopes`
- `context`
- `expires_at`
- `consumed_at`

### Tabela `oauth_connection`

Usada para guardar a conexao OAuth persistida.

Campos principais:

- `provider`
- `user_id`
- `status`
- `external_user_id`
- `external_user_email`
- `external_account_id`
- `external_account_name`
- `access_token`
- `refresh_token`
- `token_type`
- `scopes`
- `expires_at`
- `connected_at`
- `last_refreshed_at`
- `metadata`

## Variaveis de ambiente

Necessarias para Google Ads:

```env
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_LOGIN_CUSTOMER_ID=...
GOOGLE_ADS_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/google-ads/callback
GOOGLE_ADS_OAUTH_SCOPES=https://www.googleapis.com/auth/adwords,openid,email,profile
```

Importante:

- o valor de `GOOGLE_ADS_OAUTH_REDIRECT_URI` precisa ser exatamente o mesmo cadastrado no Google Cloud Console
- se o redirect nao bater, o Google retorna `redirect_uri_mismatch`

## Fluxo atual

1. O frontend chama `GET /oauth/google-ads/authorize`
2. O backend cria o `state` e devolve a `authorizationUrl`
3. O frontend abre essa URL no navegador
4. O usuario faz login e consente no Google
5. O Google chama `GET /oauth/google-ads/callback`
6. O backend troca `code` por token e salva a conexao
7. O frontend consulta `GET /oauth/connections` para verificar o resultado
8. O frontend chama `GET /oauth/google-ads/connections/:connectionId/accounts`
9. O usuario escolhe a conta Google Ads
10. O frontend chama `POST /oauth/google-ads/connections/:connectionId/select-account`

## Endpoints

### 0. Pagina MVP do backend

`GET /oauth/google-ads/page`

Essa rota entrega uma pagina HTML simples para testar o fluxo no proprio backend, sem depender do frontend.

O que a pagina faz:

- chama `GET /oauth/google-ads/authorize`
- redireciona para o Google
- recebe o retorno do callback na propria pagina
- consulta `GET /oauth/connections?provider=google_ads`
- consulta `GET /oauth/google-ads/connections/:connectionId/accounts`
- permite chamar `POST /oauth/google-ads/connections/:connectionId/select-account`
- permite informar `x-api-key` para testar os endpoints internos de sincronizacao e extracao
- permite sincronizar contas em `marketing-sync`
- permite marcar contas para extracao
- permite criar e listar jobs diarios

Exemplo:

```bash
curl "http://localhost:3000/oauth/google-ads/page"
```

Uso esperado:

- abrir no navegador `http://localhost:3000/oauth/google-ads/page`
- clicar em `Conectar Google Ads`
- concluir o login
- selecionar a conta Google Ads final
- informar a `x-api-key` interna para testar `marketing-sync`
- sincronizar contas e criar jobs pela mesma pagina

### 1. Iniciar autorizacao

`GET /oauth/google-ads/authorize`

Query params:

- `userId` opcional
- `frontendRedirectUrl` opcional

Exemplo sem params:

```bash
curl "http://localhost:3000/oauth/google-ads/authorize"
```

Exemplo com params:

```bash
curl "http://localhost:3000/oauth/google-ads/authorize?userId=USER_UUID&frontendRedirectUrl=http://localhost:3001/integrations/google-ads/callback"
```

Resposta esperada:

```json
{
  "provider": "google_ads",
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "2d99a5eec5538e74f088cc29f13780f09a78825a71fa0e99",
  "expiresAt": "2026-03-30T12:11:49.782Z",
  "scopes": [
    "https://www.googleapis.com/auth/adwords",
    "openid",
    "email",
    "profile"
  ]
}
```

Uso esperado no frontend:

- chamar esse endpoint
- pegar `authorizationUrl`
- redirecionar o navegador para essa URL

### 2. Callback do Google

`GET /oauth/google-ads/callback`

Este endpoint normalmente nao eh chamado manualmente pelo frontend.
Quem chama eh o Google apos o consentimento do usuario.

Query params recebidos do Google:

- `code`
- `state`
- `error`
- `error_description`

Exemplo de chamada manual para debug:

```bash
curl "http://localhost:3000/oauth/google-ads/callback?code=GOOGLE_CODE&state=OAUTH_STATE"
```

Resposta esperada sem `frontendRedirectUrl`:

```json
{
  "provider": "google_ads",
  "connectionId": "uuid-da-conexao",
  "userEmail": "usuario@gmail.com",
  "scopes": [
    "https://www.googleapis.com/auth/adwords",
    "openid",
    "email",
    "profile"
  ],
  "expiresAt": "2026-03-30T13:20:00.000Z",
  "frontendRedirectUrl": null,
  "hasRefreshToken": true,
  "loginCustomerId": "8950904507"
}
```

Se `frontendRedirectUrl` tiver sido enviado no `/authorize`, o backend faz redirect para essa URL ao final do callback com os query params:

- `provider`
- `connectionId`
- `hasRefreshToken`

Exemplo:

```text
http://localhost:3001/integrations/google-ads/callback?provider=google_ads&connectionId=UUID&hasRefreshToken=true
```

### 3. Listar conexoes salvas

`GET /oauth/connections`

Query params:

- `provider` opcional
- `userId` opcional

Exemplo geral:

```bash
curl "http://localhost:3000/oauth/connections"
```

Exemplo filtrando Google Ads:

```bash
curl "http://localhost:3000/oauth/connections?provider=google_ads"
```

Exemplo filtrando por usuario:

```bash
curl "http://localhost:3000/oauth/connections?provider=google_ads&userId=USER_UUID"
```

Resposta esperada:

```json
[
  {
    "id": "uuid-da-conexao",
    "provider": "google_ads",
    "status": "active",
    "userId": null,
    "externalUserId": "123456789012345678901",
    "externalUserEmail": "usuario@gmail.com",
    "externalAccountId": null,
    "externalAccountName": null,
    "scopes": [
      "https://www.googleapis.com/auth/adwords",
      "openid",
      "email",
      "profile"
    ],
    "expiresAt": "2026-03-30T13:20:00.000Z",
    "connectedAt": "2026-03-30T12:20:00.000Z",
    "lastRefreshedAt": "2026-03-30T12:20:00.000Z",
    "createdAt": "2026-03-30T12:20:00.000Z",
    "updatedAt": "2026-03-30T12:20:00.000Z",
    "metadata": {
      "emailVerified": true,
      "name": "Nome do Usuario",
      "picture": "https://...",
      "developerTokenConfigured": true,
      "loginCustomerId": "8950904507"
    }
  }
]
```

### 4. Listar contas Google Ads acessiveis

`GET /oauth/google-ads/connections/:connectionId/accounts`

Exemplo:

```bash
curl "http://localhost:3000/oauth/google-ads/connections/CONNECTION_UUID/accounts"
```

Resposta esperada:

```json
{
  "connectionId": "uuid-da-conexao",
  "provider": "google_ads",
  "selectedAccountId": null,
  "selectedAccountName": null,
  "accounts": [
    {
      "resourceName": "customers/1234567890",
      "customerId": "1234567890",
      "descriptiveName": "Conta Principal",
      "currencyCode": "BRL",
      "timeZone": "America/Sao_Paulo",
      "manager": false,
      "testAccount": false,
      "accessible": true,
      "errorCode": null,
      "errorMessage": null
    },
    {
      "resourceName": "customers/5724316935",
      "customerId": "5724316935",
      "descriptiveName": null,
      "currencyCode": null,
      "timeZone": null,
      "manager": null,
      "testAccount": null,
      "accessible": false,
      "errorCode": "USER_PERMISSION_DENIED",
      "errorMessage": "User doesn't have permission to access customer. Note: If you're accessing a client customer, the manager's customer id must be set in the 'login-customer-id' header."
    }
  ]
}
```

Observacoes:

- esse endpoint usa `refresh_token` para renovar o token se necessario
- se a conexao nao tiver `refresh_token`, a listagem pode falhar
- o `customerId` retornado ja vem pronto para ser salvo
- contas com `accessible: false` devem aparecer na UI apenas como informativas e nao podem ser selecionadas

### 5. Selecionar conta Google Ads

`POST /oauth/google-ads/connections/:connectionId/select-account`

Payload:

```json
{
  "customerId": "1234567890",
  "customerName": "Conta Principal"
}
```

Exemplo com `curl`:

```bash
curl -X POST "http://localhost:3000/oauth/google-ads/connections/CONNECTION_UUID/select-account" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "1234567890",
    "customerName": "Conta Principal"
  }'
```

Resposta esperada:

```json
{
  "connectionId": "uuid-da-conexao",
  "provider": "google_ads",
  "externalAccountId": "1234567890",
  "externalAccountName": "Conta Principal",
  "metadata": {
    "emailVerified": true,
    "name": "Nome do Usuario",
    "picture": "https://...",
    "developerTokenConfigured": true,
    "loginCustomerId": "8950904507",
    "selectedAccount": {
      "resourceName": "customers/1234567890",
      "customerId": "1234567890",
      "descriptiveName": "Conta Principal",
      "currencyCode": "BRL",
      "timeZone": "America/Sao_Paulo",
      "manager": false,
      "testAccount": false
    }
  }
}
```

## Como o frontend deve usar

Fluxo sugerido para a primeira tela:

1. Exibir botao `Conectar Google Ads`
2. Ao clicar, chamar `GET /oauth/google-ads/authorize`
3. Pegar `authorizationUrl`
4. Redirecionar o navegador para o Google
5. Apos retorno do callback, consultar `GET /oauth/connections?provider=google_ads`
6. Ler o `connectionId`
7. Chamar `GET /oauth/google-ads/connections/:connectionId/accounts`
8. Exibir as contas Google Ads disponiveis
9. Usuario escolhe uma conta
10. Chamar `POST /oauth/google-ads/connections/:connectionId/select-account`
11. Exibir status final da conexao criada

Para MVP imediato, essa mesma experiencia ja existe no backend em:

```text
/oauth/google-ads/page
```

Essa pagina pode ser usada como referencia funcional para o frontend.

No estado atual, ela tambem serve como painel tecnico de backoffice para:

- sincronizar contas da conexao
- marcar contas para extracao
- criar jobs diarios
- listar e processar jobs
- visualizar payload bruto e performance consolidada da extracao

Informacoes minimas que a tela deve mostrar:

- provider conectado
- email da conta Google conectada
- status da conexao
- data da conexao
- se existe `refresh_token`
- lista de contas Google Ads acessiveis
- conta Google Ads selecionada
- lista de contas sincronizadas para extracao
- lista de jobs de extracao

## Como levar para o backoffice depois

O fluxo recomendado no backoffice e:

1. tela de conexoes:
   mostrar conexoes OAuth e status
2. tela de contas por conexao:
   listar contas acessiveis e contas sincronizadas
3. acao de sincronizacao:
   chamar `POST /marketing-sync/connections/:connectionId/accounts/refresh`
4. acao de selecao operacional:
   chamar `PATCH /marketing-sync/accounts/:accountId/selection`
5. acao de extracao manual:
   chamar `POST /marketing-sync/jobs/daily`
6. monitoramento:
   chamar `GET /marketing-sync/jobs`

Para o backoffice real, o ideal e:

- nao expor `x-api-key` no browser
- usar sessao/autenticacao interna de admin
- fazer o frontend chamar um backend autenticado da propria aplicacao

## Debitos tecnicos

- tokens estao sendo salvos em texto puro; precisam ser criptografados
- falta endpoint para remover/desativar conexao
- falta endpoint para listar `oauth_state` para debug
- existe refresh on-demand, mas falta refresh automatico com estrategia clara
- falta associar a conexao a tenant/empresa se o produto exigir multitenancy
- falta auditoria mais clara de reconexao, revogacao e erros
- falta tratamento de expiracao/revogacao no consumo posterior da API Google Ads
- falta padronizacao de DTOs Swagger para responses
- falta cobertura de testes automatizados
- ainda nao existe tela de frontend
- falta definir se a conexao pode ter varias contas selecionadas ou apenas uma
- falta endpoint para importar ou validar acesso da conta selecionada com uma query real de negocio

## Pontos a alinhar com produto

- a conexao eh vinculada a usuario, empresa ou workspace?
- um usuario pode conectar varias contas Google Ads?
- apos o login, o usuario precisa escolher qual conta Google Ads deseja usar?
- se houver varias contas acessiveis, uma unica conta sera selecionada ou varias?
- o produto vai ler apenas metricas ou tambem configuracoes de campanhas, ad groups, ads e keywords?
- quais metricas sao obrigatorias no MVP?
- qual janela historica deve ser sincronizada inicialmente?
- a sincronizacao sera manual, automatica ou ambas?
- como o produto deve reagir se a conexao for revogada?
- o usuario pode reconectar outra conta sem perder o historico anterior?
- qual deve ser a tela final de sucesso/erro no frontend?
- o fluxo Meta vai seguir o mesmo conceito de conexao ou sera separado?

## Erros comuns

### `redirect_uri_mismatch`

Causa:

- o redirect URI enviado pela API nao eh igual ao cadastrado no Google Cloud Console

Como corrigir:

- conferir `GOOGLE_ADS_OAUTH_REDIRECT_URI`
- cadastrar exatamente a mesma URL no OAuth Client do Google

Exemplo correto atual:

```text
http://localhost:3000/oauth/google-ads/callback
```

### Nenhuma conexao salva apos tentativa de login

Se o erro ocorrer ainda na tela do Google, o callback nao sera chamado e nada sera gravado em `oauth_connection`.

Nesse caso, o problema eh de configuracao do app OAuth e nao do salvamento em banco.

### Conta aparece na listagem, mas sem permissao

Isso significa que:

- o Google retornou a conta em `listAccessibleCustomers`
- mas a consulta detalhada da conta falhou com o `login-customer-id` atual

Isso normalmente indica:

- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` incorreto para aquela conta
- o usuario enxerga a conta, mas nao por esse manager
- a hierarquia MCC -> conta cliente nao bate com o header configurado

Na pagina MVP do backend, essas contas aparecem desabilitadas com o erro retornado pela API.

## Passos operacionais

Antes de testar:

```bash
npm run migration:run
npm run start:dev
```

Depois:

1. chamar `/oauth/google-ads/authorize`
2. abrir `authorizationUrl`
3. concluir login no Google
4. chamar `/oauth/connections?provider=google_ads`
5. pegar o `connectionId`
6. chamar `/oauth/google-ads/connections/:connectionId/accounts`
7. selecionar a conta com `POST /oauth/google-ads/connections/:connectionId/select-account`

## Arquivos relevantes

- `src/oauth/oauth.controller.ts`
- `src/oauth/google-ads-oauth.service.ts`
- `src/oauth/oauth.module.ts`
- `src/database/entities/integrations/oauth-state.entity.ts`
- `src/database/entities/integrations/oauth-connection.entity.ts`
- `src/database/migrations/1770000000036-CreateOAuthTables.ts`

## O que ainda falta para o Google ficar completo

Ordem sugerida:

1. Corrigir e validar toda a configuracao do Google Cloud Console
2. Fechar a UX do frontend para conexao e selecao de conta
3. Decidir se a conexao pertence a usuario, empresa ou tenant
4. Implementar endpoint para desconectar
5. Criptografar `access_token` e `refresh_token`
6. Criar endpoint de detalhe da conexao e de debug de `oauth_state`
7. Implementar um endpoint simples de validacao da conta selecionada com consulta real na Google Ads API
8. Definir e implementar a estrategia de sincronizacao de metricas
9. Tratar revogacao, expiracao e reconexao de forma explicita
10. Criar testes automatizados
