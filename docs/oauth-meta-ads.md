# OAuth Meta Ads

## Objetivo

Este recurso cria o fluxo OAuth inicial da Meta para conectar contas de anuncios no backend, usando a mesma infraestrutura de `oauth_state` e `oauth_connection` ja criada para Google Ads.

## Env necessario

Ja existiam:

```env
META_APP_ID=...
META_APP_SECRET=...
META_CONFIG_ID=...
```

Foram acrescentados:

```env
META_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/meta/callback
META_OAUTH_SCOPES=ads_read,ads_management,business_management,email
META_API_VERSION=v22.0
```

## O que ainda precisa ser confirmado fora do codigo

- cadastrar o redirect URI exato no app da Meta
- confirmar que o app/Business Login esta no modo correto para o ambiente de teste
- confirmar que a conta usada no login faz parte dos usuarios/roles permitidos
- confirmar que essa conta realmente tem acesso aos ad accounts esperados
- confirmar se o `META_CONFIG_ID` informado e o que deve ser usado nesse app

## Fluxo implementado

1. `GET /oauth/meta/authorize`
2. redirecionamento para a Meta
3. callback em `GET /oauth/meta/callback`
4. troca do `code` por token
5. troca do token curto por token de longa duracao
6. persistencia da conexao em `oauth_connection`
7. listagem de ad accounts em `GET /oauth/meta/connections/:connectionId/accounts`
8. selecao da conta final em `POST /oauth/meta/connections/:connectionId/select-account`

## Endpoints

### Iniciar autorizacao

```bash
curl "http://localhost:3000/oauth/meta/authorize"
```

### Listar conexoes Meta

```bash
curl "http://localhost:3000/oauth/connections?provider=meta_ads"
```

### Listar contas acessiveis

```bash
curl "http://localhost:3000/oauth/meta/connections/CONNECTION_UUID/accounts"
```

### Selecionar conta

```bash
curl -X POST "http://localhost:3000/oauth/meta/connections/CONNECTION_UUID/select-account" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "123456789012345",
    "accountName": "Conta Meta Principal"
  }'
```

## Pagina MVP compartilhada

A mesma pagina de teste do backend agora atende os dois providers:

```text
/oauth/google-ads/page
```

Ela permite:

- conectar Google Ads
- conectar Meta Ads
- ver conexoes salvas
- listar contas acessiveis
- selecionar a conta final

## Debitos tecnicos

- tokens seguem sem criptografia em repouso
- o token da Meta ainda nao tem rotina de renovacao automatica
- falta endpoint de desconexao
- falta importacao real de campanhas e metricas
- falta tratamento mais detalhado de pagina de erro/sucesso especifica da Meta
