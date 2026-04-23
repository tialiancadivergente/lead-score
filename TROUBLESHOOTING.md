# Troubleshooting - Deploy no AKS

## Problema: Pods em CrashLoopBackOff

### Sintomas
- Pods não iniciam
- Status: `CrashLoopBackOff`
- Erro nos logs: `password authentication failed for user "leadscore"`

### Causa Raiz
Os arquivos `.env` e potencialmente os scripts tinham **line endings do Windows** (CRLF - `\r\n`) em vez de Unix (LF - `\n`). 

Quando o script `create-k8s-secrets.sh` leu as variáveis do `.env`, incluiu os caracteres `\r` (carriage return) nos valores, resultando em senha incorreta.

### Solução

1. **Corrigir line endings no arquivo .env:**
```bash
sed -i '' 's/\r$//' .env
```

2. **Deletar e recriar os secrets:**
```bash
kubectl delete secret lead-score-secrets -n lead-score
./create-k8s-secrets.sh
```

3. **Reiniciar o deployment:**
```bash
kubectl rollout restart deployment/lead-score-app -n lead-score
```

### Como Prevenir

Os scripts já foram corrigidos para evitar este problema no futuro. Mas se você criar novos arquivos no Windows, sempre execute:

```bash
# Para um arquivo específico
sed -i '' 's/\r$//' arquivo.txt

# Para todos arquivos .sh
for file in *.sh; do sed -i '' 's/\r$//' "$file"; done

# Para o .env
sed -i '' 's/\r$//' .env
```

### Verificação

Para verificar se um arquivo tem line endings do Windows:

```bash
# Mostrar caracteres invisíveis
cat -A arquivo.txt

# Se ver ^M no final das linhas, são line endings do Windows
```

---

## Checklist de Troubleshooting

Quando os pods não iniciarem, siga esta ordem:

### 1. Ver status dos pods
```bash
kubectl get pods -n lead-score
```

### 2. Ver logs do pod com erro
```bash
# Pegar nome do pod
POD_NAME=$(kubectl get pods -n lead-score -o jsonpath='{.items[0].metadata.name}')

# Ver logs
kubectl logs $POD_NAME -n lead-score --tail=100

# Ver logs anteriores (se pod já reiniciou)
kubectl logs $POD_NAME -n lead-score --previous
```

### 3. Descrever o pod
```bash
kubectl describe pod $POD_NAME -n lead-score
```

### 4. Ver eventos do namespace
```bash
kubectl get events -n lead-score --sort-by='.lastTimestamp' | tail -20
```

### 5. Problemas Comuns e Soluções

#### Erro de autenticação no banco
```bash
# Verificar secrets
kubectl get secret lead-score-secrets -n lead-score -o yaml
kubectl get secret lead-score-secrets -n lead-score -o jsonpath='{.data.DB_PASSWORD}' | base64 -d

# Recriar secrets
sed -i '' 's/\r$//' .env
kubectl delete secret lead-score-secrets -n lead-score
./create-k8s-secrets.sh
kubectl rollout restart deployment/lead-score-app -n lead-score
```

#### Erro ao puxar imagem do ACR
```bash
# Verificar se ACR está anexado ao AKS
az aks show -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --query "servicePrincipalProfile"

# Reanexar ACR
az aks update -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --attach-acr $ACR_NAME

# Ou usar image pull secret manualmente
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_NAME.azurecr.io \
  --docker-username=$ACR_NAME \
  --docker-password=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
  -n lead-score
```

#### Pods sem recursos suficientes
```bash
# Ver uso de recursos
kubectl top pods -n lead-score
kubectl top nodes

# Ajustar resources no deployment
kubectl edit deployment lead-score-app -n lead-score
```

#### Health checks falhando
```bash
# Testar health check manualmente
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score
curl http://localhost:3000/health

# Ajustar timeouts no deployment se necessário
```

#### Erro de conexão com Service Bus
```bash
# Verificar se connection string está correta
kubectl get secret lead-score-secrets -n lead-score -o jsonpath='{.data.SERVICE_BUS_CONNECTION_STRING}' | base64 -d

# Verificar se o Service Bus está acessível do AKS
# Pode ser necessário configurar Private Link ou Service Endpoint
```

---

## Comandos Úteis para Debug

### Entrar no container
```bash
kubectl exec -it <POD_NAME> -n lead-score -- sh

# Dentro do container:
env | grep DB_
curl localhost:3000/health
```

### Ver configuração do deployment
```bash
kubectl get deployment lead-score-app -n lead-score -o yaml
```

### Ver HPA status
```bash
kubectl get hpa -n lead-score
kubectl describe hpa lead-score-hpa -n lead-score
```

### Forçar novo rollout
```bash
kubectl rollout restart deployment/lead-score-app -n lead-score
kubectl rollout status deployment/lead-score-app -n lead-score
```

### Rollback
```bash
# Ver histórico
kubectl rollout history deployment/lead-score-app -n lead-score

# Rollback
kubectl rollout undo deployment/lead-score-app -n lead-score
```

### Escalar manualmente
```bash
kubectl scale deployment lead-score-app --replicas=3 -n lead-score
```

---

## Resultado Final do Deploy

Após corrigir os line endings e recriar os secrets:

```
NAME                                  READY   STATUS    RESTARTS   AGE
pod/lead-score-app-58cdbdc8c4-6k5f2   1/1     Running   0          40s
pod/lead-score-app-58cdbdc8c4-pg2fd   1/1     Running   0          56s

NAME                         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/lead-score-service   ClusterIP   10.0.171.185   <none>        80/TCP    15m

NAME                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/lead-score-app   2/2     2            2           15m
```

✅ Deploy realizado com sucesso!
✅ 2 pods rodando
✅ Service exposto
✅ HPA configurado
✅ Aplicação conectada ao banco
✅ Service Bus consumer ativo

---

## Próximos Passos

1. **Testar a aplicação:**
```bash
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score
curl http://localhost:3000/health
```

2. **Rodar migrations:**
```bash
./run-migrations.sh
```

3. **Monitorar logs:**
```bash
kubectl logs -f deployment/lead-score-app -n lead-score
```

4. **(Opcional) Instalar Ingress:**
```bash
./install-ingress.sh
```
