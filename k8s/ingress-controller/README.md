# Prioridade do controlador de entrada

Em 27/10/2026, o unico pod do NGINX ficou `Pending` por falta de recursos
de agendamento: um node sem CPU reservavel e outro sem memoria reservavel.
A API continuou saudavel internamente, mas seu endereco publico deixou de
responder e o encaminhamento do formulario WordPress passou a falhar.

O ajuste foi aplicado com autorizacao em 27/10/2026, por volta de 12h43
(America/Sao_Paulo). O rollout terminou com o controlador `1/1 Running` e
`GET /health` publico retornando HTTP 200. O scheduler interrompeu o
`retina-agent-pccgt` (observabilidade de rede), cuja reposicao ficou pendente;
as tres replicas da API e os dois workers de cadastro ativos foram preservados.
O terceiro worker de cadastro e outro agente Retina ja estavam pendentes.
Ainda e necessario resolver a capacidade do cluster para acomodar todos eles.

Um POST de diagnostico contendo somente `url`, sem os campos obrigatorios,
confirmou a resposta HTTP 400 `property url should not exist` na API publicada,
sem enfileirar cadastro. A correcao de compatibilidade no DTO e independente
deste ajuste de infraestrutura e depende de publicacao da aplicacao.

`priority-class.yaml` define prioridade 10000, acima dos pods comuns (0) e
abaixo dos componentes criticos do Kubernetes (2000000000 ou mais).
`controller-priority-patch.yaml` aplica essa classe somente ao controlador.
O ajuste nao aumenta a capacidade do cluster: pode interromper e recriar pods
de menor prioridade para liberar espaco. Esses pods podem permanecer pendentes
ate haver recursos. A selecao das vitimas e feita pelo scheduler e nao fica
restrita ao namespace da API.

Os arquivos sao separados do kustomization da aplicacao porque o controlador
fica no namespace `ingress-nginx`. A instalacao via `install-ingress.sh` ja
inclui esse ajuste. Para um controlador existente, revisar o impacto antes de
aplicar em producao:

```powershell
kubectl --context lead-score-aks apply --dry-run=server -f k8s/ingress-controller/priority-class.yaml
kubectl --context lead-score-aks apply -f k8s/ingress-controller/priority-class.yaml
kubectl --context lead-score-aks patch deployment ingress-nginx-controller -n ingress-nginx --type=merge --patch-file k8s/ingress-controller/controller-priority-patch.yaml
kubectl --context lead-score-aks rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s
kubectl --context lead-score-aks get pods -n ingress-nginx -o wide
curl.exe --connect-timeout 5 --max-time 10 https://leads-api.aliancadivergente.com.br/health
```

Para desfazer o patch, restaurar a revisao anterior do deployment, aguardar a
conclusao e remover a classe quando nao houver pods utilizando-a:

```powershell
kubectl --context lead-score-aks rollout undo deployment/ingress-nginx-controller -n ingress-nginx
kubectl --context lead-score-aks rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s
kubectl --context lead-score-aks delete priorityclass lead-score-ingress
```

O rollback pode devolver o controlador ao estado `Pending` se ainda faltar
capacidade. Planejar mais capacidade ou reduzir a reserva de outros workloads
com base em metricas para acomodar todas as replicas desejadas.
