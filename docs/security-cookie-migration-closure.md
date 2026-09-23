# Fechamento da migracao de cookies httpOnly

## Estado implementado no backend

- `POST /auth/login` emite `access_token` e `refresh_token` apenas via `Set-Cookie`.
- `POST /auth/login` nao retorna mais `accessToken` nem `refreshToken` no corpo; retorna apenas `{ user }`.
- `POST /auth/refresh` aceita refresh token por cookie ou, temporariamente, por body legado.
- `POST /auth/refresh` rotaciona o refresh token, reemite cookies e retorna apenas `{ user }`.
- `POST /auth/logout` aceita body vazio.
- `POST /auth/logout` tenta revogar pelo `refresh_token` quando ele chega no body/cookie.
- Como o cookie `refresh_token` usa `Path=/auth/refresh`, o logout tambem aceita o `access_token` cookie para identificar o usuario e revogar os refresh tokens ativos desse usuario.
- `POST /auth/logout` sempre limpa os cookies de acesso e refresh na resposta.

## Rate limit e X-Forwarded-For

Decisao atual: o backend so confia em `X-Real-IP`, `X-Vercel-Forwarded-For` ou `X-Forwarded-For` quando o IP de conexao estiver na allowlist `AUTH_TRUSTED_PROXY_CIDRS`.

Motivo: a API publica tambem pode receber trafego fora do proxy do painel. Confiar em headers encaminhados sem uma allowlist de proxies confiaveis abriria risco de spoofing do IP e bypass do rate limit.

Contrato atual:

- Bucket de auth: IP real encaminhado por proxy confiavel + subject quando aplicavel.
- Quando a origem nao esta na allowlist, o backend ignora os headers encaminhados e usa o IP do socket.
- `login` e `forgot-password`: IP + email normalizado.
- `refresh`: IP + `anonymous`.
- Ao exceder o limite: HTTP `429` com header `Retry-After`.

Em producao, a allowlist deve cobrir apenas redes internas/proxies controlados pela infraestrutura.

## Storage antigo de imagens

O upload novo de imagens de template ja passa pelo backend em `POST /page/template-images`, com validacao de tipo real, extensao e tamanho.

Inventario em producao feito em 2026-09-23:

- Foram encontradas 4 URLs antigas em `ybpihjcumohftoqlkbyr.supabase.co`.
- As 4 imagens foram copiadas para o Azure Blob `page-template-images`.
- Os registros em `page_version.template_image_url` foram atualizados para `leadscoreexports.blob.core.windows.net`.
- Inventario final: nenhuma URL do Supabase permanece em `template_image_url`.

Com isso, o backend/painel nao dependem mais do storage antigo para imagens de template.

Acao externa restante: tornar privado/remover o bucket antigo no Supabase, caso ele ainda exista, pois ele nao e gerenciado por este backend/Azure.
