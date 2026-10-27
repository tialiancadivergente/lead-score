# Prompt para Lovable: exportacao de leads em background

Evolua o fluxo existente de exportacao CSV/XLSX do backoffice. Preserve o design atual e a camada de autenticacao/proxy ja usada pelo projeto. Implemente a experiencia funcional, sem criar endpoints ficticios. Nao exponha chaves internas da API no navegador.

## Contrato real do backend

1. Criar: `POST /capture/export/jobs`.
   Body: `{ "format": "xlsx", "launch_id": "UUID", "season_id": "UUID", "start_date": "2026-10-01", "end_date": "2026-10-16" }`.
   Apenas `format` e obrigatorio: `csv` ou `xlsx` (nunca `excel`). Filtros opcionais: start_date, end_date, launch_id, season_id, temperature_id, quiz_answered, email, phone. Omitir filtros vazios. quiz_answered e string `"true"`/`"false"`, nao boolean. Nao enviar page/per_page ou filtros desconhecidos.
   Retorna HTTP 201 com o job.
2. Acompanhar: `GET /capture/export/jobs/{id}`. Retorna o mesmo formato de job.
3. Autorizar download: `GET /capture/export/jobs/{id}/download-url`. Chamada autenticada, somente depois de status=completed.
4. Rota legada autenticada: `GET /capture/export/jobs/{id}/download`. Mantida para arquivos antigos/local, nao usar para novos arquivos em Blob quando houver mode=direct.

Exemplo de job (campos anteriores continuam presentes):

```json
{
  "id": "UUID",
  "format": "xlsx",
  "status": "processing",
  "phase": "exporting",
  "total_items": 447839,
  "processed_items": 20000,
  "percent": 4,
  "heartbeat_at": "2026-10-16T05:00:00.000Z",
  "attempt_count": 1,
  "error_message": null,
  "file_name": null,
  "file_size": null,
  "expires_at": null,
  "created_at": "2026-10-16T04:59:00.000Z",
  "started_at": "2026-10-16T04:59:02.000Z",
  "completed_at": null
}
```

- status: pending, processing, completed, failed.
- phase: queued, counting, preparing, exporting, finalizing, uploading, completed, failed.
- total_items pode ser null. file_size e string decimal em bytes ou null.
- heartbeat e atualizado a cada 15 segundos durante o processamento, inclusive sem mudanca da quantidade exportada.
- percent nunca chega a 100 antes de completed. Nao inferir conclusao a partir de processed_items == total_items.
- Jobs interrompidos podem ser recuperados apos 5 minutos sem heartbeat, ate 3 tentativas. A recuperacao recomeca a geracao: processed_items pode diminuir e attempt_count aumenta. Nao esconder essa mudanca.

Resposta de download-url para Blob:

```json
{
  "mode": "direct",
  "url": "https://ACCOUNT.blob.core.windows.net/capture-exports/FILE?SAS",
  "expires_at": "2026-10-16T05:15:00.000Z",
  "file_name": "capture-export-UUID.csv",
  "file_size": "10461296"
}
```

Para arquivos locais/antigos, mode=api, url e uma rota relativa autenticada e expires_at=null. Resolver a rota contra a base da API/proxy existente, nao contra uma origem arbitraria.

## Estados e interacao

- Ao solicitar, abrir o modal atual e apresentar a etapa traduzida:
  queued: "Na fila"; counting: "Contando registros"; preparing: "Preparando colunas"; exporting: "Exportando registros"; finalizing: "Finalizando arquivo"; uploading: "Enviando arquivo"; completed: "Arquivo pronto"; failed: "Falha na exportacao".
- Em counting/preparing, usar indicador indeterminado. Em exporting, exibir quantidade e percentual reais. Em finalizing/uploading, mostrar indicador de atividade e nunca afirmar que o download ja terminou.
- Mostrar tempo decorrido e ultima atividade. Nao inventar ETA. Se heartbeat nao mudar por mais de 90 segundos, informar "Aguardando atualizacao do processamento" e continuar consultando. Somente status=failed representa falha do job.
- Consultar a cada 3 segundos enquanto o modal estiver aberto e 10 segundos em background. Uma requisicao por job de cada vez. Suspender enquanto offline e retomar ao voltar; tratar abas ocultas com intervalo maior.
- Nao impor limite total de 15 minutos. Cada requisicao tem timeout curto e pode ser repetida sem invalidar o job. Usar retry/backoff limitado por requisicao (por exemplo ate 30 segundos entre tentativas), sem parar o acompanhamento por duracao total.
- Erro de rede/5xx/429 na consulta: manter o job, sinalizar dificuldade de conexao e retomar; respeitar Retry-After quando existir. Em 401, usar o refresh de autenticacao existente. Em 403/404, mostrar o erro especifico e permitir encerrar o acompanhamento.
- Usar cache=no-store e configurar o proxy existente para nao armazenar respostas de status/download-url; nao interpretar 304 como falha da exportacao.
- "Fechar em background" apenas fecha o modal, sem cancelar o job. Manter um indicador compacto de exportacoes e permitir reabrir.
- Persistir apenas id, formato e created_at, em armazenamento separado por usuario/conta. Nao persistir token, URL SAS, email, telefone ou dados de leads. Reconsultar os jobs ao recarregar a pagina; limpar o estado visual ao sair da conta.
- Evitar POST duplicado por clique duplo. Fechar/reabrir/recarregar nao cria outro job. Usar o mesmo job ate falhar ou expirar.

## Download

- Somente em completed, obter download-url pela camada autenticada.
- Em mode=direct, iniciar download nativo via navegacao/link para a URL assinada. Nao fazer Axios/fetch responseType=blob e nao passar o arquivo pelo proxy. Nao adicionar Authorization/x-api-key ao pedido para o Blob. O Blob define Content-Disposition; nao depender do atributo download entre origens.
- Oferecer "Baixar arquivo" e "Baixar novamente". Caso haja download automatico no fluxo atual, disparar no maximo uma vez por job, evitando disparos por cada polling, remontagem ou aba. Sempre manter o botao manual.
- Navegar para o arquivo nao prova que o navegador concluiu a transferencia: usar "Download solicitado", nunca "Download concluido" sem evidencia.
- O expires_at do download-url e a validade do link (ate 15 minutos); o expires_at do job e a validade do arquivo. Buscar uma URL nova a cada tentativa manual. Nao recriar exportacao quando apenas o link expirar.
- Se o pedido de download-url retornar 409, voltar ao acompanhamento. Se retornar 410, informar que o arquivo expirou e oferecer nova exportacao. Em mode=api, manter o mecanismo autenticado existente para arquivos legados.
- Separar falha de geracao e falha de transferencia. Em failed, mostrar error_message sanitizada como texto e permitir criar um novo job com os filtros atuais. Em erro de transferencia de arquivo pronto, repetir apenas a autorizacao/download.
- URLs assinadas sao credenciais temporarias: nao enviar para analytics, logs ou armazenamento persistente; usar referrerPolicy=no-referrer no link.

## Validacao

Testar job pequeno e job grande simulado, mudancas de fase sem progresso numerico, varias atualizacoes de heartbeat, recuperacao com attempt_count incrementado, reload, fechamento em background, offline/reconexao, refresh de login, erro 429/5xx, arquivo expirado, URL temporaria renovada e ausencia de downloads/POSTs duplicados. Preservar acessibilidade e o comportamento mobile do modal atual.
