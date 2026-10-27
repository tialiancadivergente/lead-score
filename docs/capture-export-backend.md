# Exportacao de leads: atualizacao do backend

## Publicacao

Aplicar as migrations `1783300000000-CaptureExportProgress` e `1783300000001-CaptureExportIndexes` antes de iniciar a nova versao da API/worker. Os indices usam CREATE INDEX CONCURRENTLY; a segunda migration tem transaction=false e requer migrationsTransactionMode=each, ja configurado no data-source. Nao executar todas as migrations dentro de uma unica transacao.

Na imagem de producao usar um runner de migrations com as dependencias necessarias e o data-source compilado. O script legado baseado em src e dotenv de desenvolvimento nao e suficiente. Nao marcar migrations como executadas sem aplicar seus comandos.

Publicar API e capture-export-worker com a mesma versao. O manifesto do worker aumenta apenas seus timeouts de consulta para 120/125 segundos; os timeouts da API nao mudam. Concorrencia de export permanece 1 e renovacao automatica do lock e configurada para 2 horas.

## Funcionamento

- Preparacao consulta somente perguntas das respostas mais recentes nos captures filtrados, sem carregar todos os leads/pontuacoes/respostas em memoria.
- Lotes usam paginação por data/id com precisao de microssegundos. CSV e escrito uma vez por lote; XLSX permanece streaming.
- A criacao fixa o end_date quando ausente para limitar novas entradas durante a geracao. Nao e um snapshot transacional: alteracoes de leads e respostas durante o export ainda podem ser refletidas.
- Cada tentativa tem lease_token exclusivo; atualizacoes de progresso/conclusao/falha exigem esse token. Heartbeat a cada 15 segundos. O consumer verifica a cada minuto jobs pending esquecidos ou processing sem heartbeat por 5 minutos e os reenfileira. A recuperacao reinicia o arquivo; ate 3 tentativas por job interrompido. Falhas capturadas terminam em failed e exigem nova solicitacao.
- Status nao seleciona file_data de exports antigos. Blob e local usam streaming no endpoint legado; a leitura do bytea acontece somente ao baixar um arquivo antigo.
- Novo endpoint autenticado GET /capture/export/jobs/:id/download-url entrega SAS somente leitura por ate 15 minutos, limitada pela validade do arquivo, com Content-Disposition attachment. Fallback mode=api preserva arquivos legados/locais. Expiracao do arquivo retorna 410; job incompleto retorna 409.
- Nao registrar URLs assinadas. A auditoria registra a autorizacao, nao o conteudo do link. O endpoint existente de download continua disponivel.
- Status, download-url e download usam Cache-Control: private, no-store. O frontend/proxy deve respeitar isso.

## Validacao antes de medir ganhos

Build e testes locais nao substituem benchmark de 447 mil registros no ambiente real. Apos publicar migrations e codigo, comparar CSV/XLSX com os mesmos filtros, tempos por fase, contagem, memoria e falhas. O tempo de geracao depende do banco/worker e da quantidade de respostas do quiz. Download direto exige a integracao descrita em lovable-lead-export-prompt.md.

Arquivos expirados deixam de ser autorizados pela API; remocao fisica do Blob depende da politica de lifecycle do storage. O mecanismo novo nao altera essa politica.
