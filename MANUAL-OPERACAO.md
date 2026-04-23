# Manual de Auto-Scaling e Operação - Lead Score API

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Auto-Scaling (HPA)](#auto-scaling-hpa)
3. [Monitoramento](#monitoramento)
4. [Deploy e Atualizações](#deploy-e-atualizações)
5. [Troubleshooting](#troubleshooting)
6. [Comandos Úteis](#comandos-úteis)
7. [Testes de Carga](#testes-de-carga)

---

## Visão Geral

### Status da Aplicação

**URL de Produção**: `https://leads-api.aliancadivergente.com.br`

**Componentes:**
- ✅ NestJS API rodando em container Docker
- ✅ PostgreSQL Azure Database (gerenciado)
- ✅ Azure Service Bus (filas)
- ✅ NGINX Ingress Controller
- ✅ SSL/TLS com Let's Encrypt
- ✅ Auto-scaling (HPA) configurado
- ✅ Alta disponibilidade (mínimo 2 pods)

### Recursos do Cluster

| Recurso | Configuração |
|---------|--------------|
| **Min Pods** | 2 réplicas |
| **Max Pods** | 10 réplicas |
| **CPU por Pod** | Request: 100m, Limit: 500m |
| **RAM por Pod** | Request: 256Mi, Limit: 512Mi |
| **Namespace** | lead-score |
| **ACR** | leadscoreacr.azurecr.io |

---

## Auto-Scaling (HPA)

### Configuração Atual

```yaml
Min Replicas: 2
Max Replicas: 10
Target CPU: 70%
Target Memory: 80%
```

### Como Funciona

O HPA (Horizontal Pod Autoscaler) monitora o uso de CPU e memória e ajusta automaticamente o número de pods.

#### Triggers de Escalabilidade

| Métrica | Threshold | Ação |
|---------|-----------|------|
| **CPU** | > 70% | Aumenta pods |
| **Memória** | > 80% | Aumenta pods |
| **CPU** | < 70% por 5min | Reduz pods |
| **Memória** | < 80% por 5min | Reduz pods |

### Comportamento de Scale Up (Aumentar)

**Quando:** CPU ou Memória ultrapassam os limites

**Velocidade:** Rápido (0 segundos de espera)

**Políticas aplicadas (a maior prevalece):**
1. **Percentual**: Dobra o número de pods a cada 30 segundos
   - Exemplo: 2 → 4 → 8 → 10
2. **Absoluto**: Adiciona 2 pods a cada 30 segundos
   - Exemplo: 2 → 4 → 6 → 8 → 10

#### Cenário Real - Scale Up
```
Momento 0s:   2 pods (CPU: 30%)
Momento 10s:  Tráfego aumenta (CPU: 75%)
Momento 30s:  HPA detecta e adiciona pods → 4 pods
Momento 60s:  Se ainda alto (CPU: 72%) → 8 pods
Momento 90s:  Se ainda alto (CPU: 71%) → 10 pods (máximo)
```

### Comportamento de Scale Down (Reduzir)

**Quando:** Carga diminui e fica abaixo dos limites

**Velocidade:** Gradual (aguarda 5 minutos)

**Política:**
- Reduz 50% dos pods a cada 60 segundos
- Nunca reduz abaixo do mínimo (2 pods)

#### Cenário Real - Scale Down
```
Momento 0s:     8 pods (CPU: 75%)
Momento 60s:    Tráfego diminui (CPU: 40%)
Momento 360s:   Após 5min de estabilidade → Remove 50% → 4 pods
Momento 420s:   Após 1min (CPU: 25%) → Remove 50% → 2 pods
Momento final:  Mantém 2 pods (mínimo)
```

### Verificar Status do HPA

```bash
# Ver resumo do HPA
kubectl get hpa -n lead-score

# Output esperado:
# NAME             REFERENCE                   TARGETS                        MINPODS   MAXPODS   REPLICAS
# lead-score-hpa   Deployment/lead-score-app   cpu: 1%/70%, memory: 18%/80%   2         10        2

# Ver detalhes completos
kubectl describe hpa lead-score-hpa -n lead-score
```

### Ajustar Thresholds

Se precisar tornar o auto-scaling mais ou menos sensível:

**Editar arquivo:**
```bash
nano k8s/06-hpa.yaml
```

**Exemplos de ajustes:**

```yaml
# Mais sensível (escala mais cedo)
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      averageUtilization: 50  # Escala quando CPU > 50%

# Menos sensível (escala mais tarde)
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      averageUtilization: 85  # Escala quando CPU > 85%
```

**Aplicar alterações:**
```bash
kubectl apply -f k8s/06-hpa.yaml
```

---

## Monitoramento

### Métricas em Tempo Real

#### Ver uso de recursos dos pods
```bash
kubectl top pods -n lead-score

# Output:
# NAME                              CPU(cores)   MEMORY(bytes)
# lead-score-app-67d5bcc6c6-2bkjd   1m           48Mi
# lead-score-app-67d5bcc6c6-lpdqp   1m           46Mi
```

#### Monitorar continuamente
```bash
# HPA
watch kubectl get hpa -n lead-score

# Pods
watch kubectl get pods -n lead-score

# Recursos
watch kubectl top pods -n lead-score
```

### Logs

#### Ver logs em tempo real
```bash
# De todos os pods
kubectl logs -f deployment/lead-score-app -n lead-score

# De um pod específico
kubectl logs -f <POD_NAME> -n lead-score

# Últimas 100 linhas
kubectl logs --tail=100 deployment/lead-score-app -n lead-score
```

#### Ver logs de eventos de scaling
```bash
kubectl get events -n lead-score --sort-by='.lastTimestamp' | grep -i scale
```

### Dashboards Recomendados

**Azure Monitor:**
```bash
# Habilitar Azure Monitor para AKS
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --addons monitoring
```

**Prometheus + Grafana (Alternativa):**
```bash
# Instalar via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

---

## Deploy e Atualizações

### Workflow Padrão

#### 1. Fazer alterações no código
```bash
# Exemplo: adicionar nova rota
# src/lead-registration/lead-registration.controller.ts

@Get('new-endpoint')
newEndpoint(): string {
  return 'Funcionando!';
}
```

#### 2. Testar localmente (opcional)
```bash
npm run start:dev
curl http://localhost:3000/lead-registration/new-endpoint
```

#### 3. Fazer commit (recomendado)
```bash
git add .
git commit -m "feat: add new endpoint"
git push
```

#### 4. Deploy para produção
```bash
# Carregar variáveis de ambiente
source azure-env.sh

# Deploy com nova versão
./deploy.sh production v1.0.5 --skip-ingress

# Aguardar conclusão...
```

#### 5. Verificar deploy
```bash
# Ver status dos pods
kubectl get pods -n lead-score

# Ver logs
kubectl logs -f deployment/lead-score-app -n lead-score

# Testar endpoint
curl https://leads-api.aliancadivergente.com.br/lead-registration/new-endpoint
```

### Tipos de Deploy

#### Deploy completo (novo código)
```bash
./deploy.sh production v1.0.6 --skip-ingress
```
- ✅ Build da imagem
- ✅ Push para ACR
- ✅ Atualiza pods
- ⏱️ Tempo: 3-5 minutos

#### Deploy rápido (sem rebuild)
```bash
./deploy.sh production v1.0.6 --skip-build --skip-ingress
```
- ❌ Sem build
- ✅ Usa imagem existente no ACR
- ✅ Atualiza manifests
- ⏱️ Tempo: 30-60 segundos

#### Deploy apenas de configs
```bash
# Apenas ConfigMap
kubectl apply -f k8s/01-configmap.yaml

# Reiniciar pods para pegar novas configs
kubectl rollout restart deployment/lead-score-app -n lead-score
```

### Rollback

#### Ver histórico de versões
```bash
kubectl rollout history deployment/lead-score-app -n lead-score
```

#### Voltar para versão anterior
```bash
kubectl rollout undo deployment/lead-score-app -n lead-score
```

#### Voltar para versão específica
```bash
# Ver revisões
kubectl rollout history deployment/lead-score-app -n lead-score

# Voltar para revisão específica
kubectl rollout undo deployment/lead-score-app --to-revision=3 -n lead-score
```

#### Fazer rollback via deploy.sh
```bash
# Deploy da versão antiga
./deploy.sh production v1.0.4 --skip-ingress
```

---

## Troubleshooting

### Pods não estão escalando

**Verificar:**
```bash
# 1. Status do HPA
kubectl describe hpa lead-score-hpa -n lead-score

# 2. Metrics server está rodando?
kubectl get deployment metrics-server -n kube-system

# 3. Ver eventos
kubectl get events -n lead-score --sort-by='.lastTimestamp'
```

**Soluções:**
```bash
# Reinstalar metrics-server se necessário
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Pods em CrashLoopBackOff

```bash
# Ver logs do pod com erro
kubectl logs <POD_NAME> -n lead-score --previous

# Ver eventos
kubectl describe pod <POD_NAME> -n lead-score

# Verificar secrets
kubectl get secret lead-score-secrets -n lead-score
```

### SSL não funciona

```bash
# Ver certificado
kubectl get certificate -n lead-score
kubectl describe certificate lead-score-tls -n lead-score

# Ver challenges
kubectl get challenge -n lead-score

# Recriar certificado
kubectl delete certificate lead-score-tls -n lead-score
kubectl apply -f k8s/05-ingress.yaml
```

### Aplicação lenta

```bash
# 1. Ver uso de recursos
kubectl top pods -n lead-score

# 2. Aumentar recursos do pod
kubectl edit deployment lead-score-app -n lead-score

# Alterar:
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

# 3. Forçar scale manual temporário
kubectl scale deployment lead-score-app --replicas=5 -n lead-score
```

### Banco de dados

```bash
# Verificar conexão
POD=$(kubectl get pods -n lead-score -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD -n lead-score -- sh

# Dentro do pod:
env | grep DB_
nc -zv $DB_HOST $DB_PORT
```

---

## Comandos Úteis

### Pods

```bash
# Listar pods
kubectl get pods -n lead-score

# Ver logs
kubectl logs -f deployment/lead-score-app -n lead-score

# Entrar no pod
kubectl exec -it <POD_NAME> -n lead-score -- sh

# Deletar pod (será recriado)
kubectl delete pod <POD_NAME> -n lead-score

# Restart de todos os pods
kubectl rollout restart deployment/lead-score-app -n lead-score
```

### Deployment

```bash
# Ver status
kubectl get deployment -n lead-score

# Escalar manualmente
kubectl scale deployment lead-score-app --replicas=3 -n lead-score

# Ver histórico
kubectl rollout history deployment/lead-score-app -n lead-score

# Ver detalhes
kubectl describe deployment lead-score-app -n lead-score
```

### Service & Ingress

```bash
# Ver services
kubectl get svc -n lead-score

# Ver ingress
kubectl get ingress -n lead-score

# Port-forward local
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score
```

### Recursos

```bash
# Ver tudo
kubectl get all -n lead-score

# Ver uso de CPU/Memória
kubectl top pods -n lead-score
kubectl top nodes

# Ver HPA
kubectl get hpa -n lead-score
```

### Secrets e ConfigMaps

```bash
# Ver secrets
kubectl get secret -n lead-score
kubectl describe secret lead-score-secrets -n lead-score

# Ver ConfigMaps
kubectl get configmap -n lead-score
kubectl describe configmap lead-score-config -n lead-score

# Recriar secrets
./create-k8s-secrets.sh
```

---

## Testes de Carga

### Teste Simples com curl

```bash
# Requisições em loop
for i in {1..1000}; do
  curl -s https://leads-api.aliancadivergente.com.br/health > /dev/null
  echo "Request $i"
done
```

### Teste com Apache Bench

```bash
# Instalar (se necessário)
# Mac: brew install apache2
# Linux: apt-get install apache2-utils

# 10.000 requisições com 100 concorrentes
ab -n 10000 -c 100 https://leads-api.aliancadivergente.com.br/health

# Com autenticação
ab -n 10000 -c 100 -H "Authorization: Bearer token" https://leads-api.aliancadivergente.com.br/health
```

### Teste com K6

**Criar arquivo de teste:**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up para 100 users
    { duration: '5m', target: 100 },  // Mantém 100 users
    { duration: '2m', target: 200 },  // Ramp up para 200 users
    { duration: '5m', target: 200 },  // Mantém 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  let response = http.get('https://leads-api.aliancadivergente.com.br/health');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Executar:**
```bash
# Instalar K6
# Mac: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Rodar teste
k6 run load-test.js
```

### Monitorar durante teste

**Terminal 1:** Rodar teste
```bash
ab -n 50000 -c 200 https://leads-api.aliancadivergente.com.br/health
```

**Terminal 2:** Monitorar HPA
```bash
watch kubectl get hpa -n lead-score
```

**Terminal 3:** Monitorar Pods
```bash
watch kubectl get pods -n lead-score
```

**Terminal 4:** Monitorar recursos
```bash
watch kubectl top pods -n lead-score
```

### Resultados Esperados

Durante um teste de carga intenso, você deve ver:

```
Fase 1 (0-30s): 2 pods, CPU subindo
Fase 2 (30-60s): HPA detecta alta CPU, adiciona pods → 4 pods
Fase 3 (60-90s): Se carga continuar, adiciona mais → 6-8 pods
Fase 4 (90s+): Pode chegar a 10 pods (máximo)
Fase 5 (após teste): Aguarda 5min, reduz gradualmente → 2 pods
```

---

## Limites e Capacidade

### Capacidade Atual

**Por Pod:**
- CPU: 100m request, 500m limit
- RAM: 256Mi request, 512Mi limit
- Pode processar ~50-100 req/s por pod

**Cluster Total (10 pods máximo):**
- CPU: 1 core request, 5 cores limit
- RAM: 2.5Gi request, 5Gi limit
- Pode processar ~500-1000 req/s total

### Quando Aumentar Limites

**Sinais de que precisa mais recursos:**
- Pods frequentemente em 80%+ de CPU/RAM
- HPA sempre no máximo (10 pods)
- Tempo de resposta alto
- Erros de timeout

**Como aumentar:**

1. **Aumentar recursos por pod:**
```yaml
# k8s/03-deployment.yaml
resources:
  requests:
    memory: "512Mi"  # dobrar
    cpu: "200m"      # dobrar
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

2. **Aumentar máximo de réplicas:**
```yaml
# k8s/06-hpa.yaml
spec:
  maxReplicas: 20  # aumentar
```

3. **Aplicar:**
```bash
kubectl apply -f k8s/03-deployment.yaml
kubectl apply -f k8s/06-hpa.yaml
```

---

## Checklist de Operação

### Diário
- [ ] Verificar logs: `kubectl logs -f deployment/lead-score-app -n lead-score`
- [ ] Verificar pods: `kubectl get pods -n lead-score`
- [ ] Verificar HPA: `kubectl get hpa -n lead-score`

### Semanal
- [ ] Verificar uso de recursos: `kubectl top pods -n lead-score`
- [ ] Verificar certificado SSL: `kubectl get certificate -n lead-score`
- [ ] Review de custos no Azure
- [ ] Backup do banco de dados

### Mensal
- [ ] Atualizar dependências
- [ ] Review de limites de recursos
- [ ] Ajustar HPA se necessário
- [ ] Review de logs de erro

### Deploy
- [ ] Testar localmente
- [ ] Fazer commit
- [ ] Rodar `./deploy.sh production vX.X.X --skip-ingress`
- [ ] Verificar pods: `kubectl get pods -n lead-score`
- [ ] Verificar logs: `kubectl logs -f deployment/lead-score-app -n lead-score`
- [ ] Testar endpoints em produção
- [ ] Monitorar por 10-15 minutos

---

## Links Úteis

### Documentação
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [NGINX Ingress](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/docs/)
- [Azure AKS](https://learn.microsoft.com/azure/aks/)

### Arquivos do Projeto
- `DEPLOY.md` - Guia completo de deploy
- `TROUBLESHOOTING.md` - Solução de problemas
- `QUICK-START.md` - Guia rápido de comandos
- `CONTAINERIZATION.md` - Arquitetura

### Comandos Rápidos

```bash
# Deploy
./deploy.sh production v1.0.0 --skip-ingress

# Monitorar
watch kubectl get pods -n lead-score

# Logs
kubectl logs -f deployment/lead-score-app -n lead-score

# Rollback
kubectl rollout undo deployment/lead-score-app -n lead-score
```

---

## Suporte

### Em caso de problemas:

1. **Verificar logs:** `kubectl logs -f deployment/lead-score-app -n lead-score`
2. **Verificar pods:** `kubectl get pods -n lead-score`
3. **Verificar eventos:** `kubectl get events -n lead-score --sort-by='.lastTimestamp'`
4. **Consultar:** `TROUBLESHOOTING.md`

### Contatos
- **DevOps:** [seu-email@dominio.com]
- **Azure Support:** Portal do Azure

---

**Última atualização:** 09/02/2026  
**Versão:** 1.0.0  
**Mantido por:** DevOps Team
