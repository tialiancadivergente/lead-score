# Guia de Deploy - Lead Score

## Pré-requisitos

### Ferramentas necessárias
- Docker Desktop ou Docker Engine
- kubectl
- Azure CLI
- Acesso ao Azure Container Registry (ACR)
- Acesso ao cluster AKS

## Desenvolvimento Local com Docker

### 1. Build da imagem
```bash
docker build -t lead-score:local .
```

### 2. Executar com docker-compose
```bash
# Subir todos os serviços (app + postgres)
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar serviços
docker-compose down
```

### 3. Executar apenas a aplicação
```bash
docker run -p 3000:3000 \
  --env-file .env \
  lead-score:local
```

## Deploy no Azure Kubernetes Service (AKS)

### 1. Configurar Azure CLI
```bash
# Login no Azure
az login

# Selecionar subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 2. Configurar ACR (Azure Container Registry)
```bash
# Criar ACR (se ainda não existir)
az acr create \
  --resource-group <RESOURCE_GROUP> \
  --name <ACR_NAME> \
  --sku Standard

# Login no ACR
az acr login --name <ACR_NAME>
```

### 3. Build e Push da imagem
```bash
# Tag da imagem
docker tag lead-score:local <ACR_NAME>.azurecr.io/lead-score:latest
docker tag lead-score:local <ACR_NAME>.azurecr.io/lead-score:v1.0.0

# Push para ACR
docker push <ACR_NAME>.azurecr.io/lead-score:latest
docker push <ACR_NAME>.azurecr.io/lead-score:v1.0.0
```

Ou use o ACR Tasks:
```bash
az acr build \
  --registry <ACR_NAME> \
  --image lead-score:latest \
  --image lead-score:v1.0.0 \
  --file Dockerfile .
```

### 4. Configurar acesso do AKS ao ACR
```bash
# Anexar ACR ao cluster AKS
az aks update \
  --resource-group <RESOURCE_GROUP> \
  --name <AKS_CLUSTER_NAME> \
  --attach-acr <ACR_NAME>
```

### 5. Conectar ao cluster AKS
```bash
# Obter credenciais do cluster
az aks get-credentials \
  --resource-group <RESOURCE_GROUP> \
  --name <AKS_CLUSTER_NAME>

# Verificar conexão
kubectl cluster-info
kubectl get nodes
```

### 6. Configurar secrets (IMPORTANTE)

**OPÇÃO A - Usar script automatizado (RECOMENDADO para desenvolvimento):**
```bash
# O script lê as secrets do arquivo .env e cria no Kubernetes
./create-k8s-secrets.sh

# Ou para namespace diferente:
./create-k8s-secrets.sh lead-score-staging

# Verificar secrets criados
kubectl get secret lead-score-secrets -n lead-score
kubectl describe secret lead-score-secrets -n lead-score
```

**OPÇÃO B - Usar Azure Key Vault (RECOMENDADO para produção):**
```bash
# 1. Instalar Secrets Store CSI Driver
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --resource-group <RESOURCE_GROUP> \
  --name <AKS_CLUSTER_NAME>

# 2. Criar Key Vault e adicionar secrets
az keyvault create \
  --name lead-score-kv \
  --resource-group <RESOURCE_GROUP> \
  --location brazilsouth

# 3. Adicionar secrets no Key Vault
az keyvault secret set --vault-name lead-score-kv --name db-password --value "YOUR_PASSWORD"
az keyvault secret set --vault-name lead-score-kv --name service-bus-connection --value "YOUR_CONNECTION_STRING"
az keyvault secret set --vault-name lead-score-kv --name activecampaign-token --value "YOUR_TOKEN"

# 4. Configurar SecretProviderClass (ver documentação Azure)
```

**OPÇÃO C - Manual com kubectl:**
```bash
kubectl create secret generic lead-score-secrets \
  --from-literal=DB_USER='leadscore' \
  --from-literal=DB_PASSWORD='YOUR_PASSWORD' \
  --from-literal=SERVICE_BUS_CONNECTION_STRING='YOUR_CONNECTION_STRING' \
  --from-literal=ACTIVECAMPAIGN_API_TOKEN='YOUR_TOKEN' \
  --namespace lead-score
```

### 7. Atualizar manifestos
```bash
# Editar k8s/03-deployment.yaml
# Substituir <YOUR_ACR_NAME> pelo nome real do seu ACR
sed -i 's/<YOUR_ACR_NAME>/YOUR_ACTUAL_ACR_NAME/g' k8s/03-deployment.yaml

# Editar k8s/05-ingress.yaml
# Substituir yourdomain.com pelo domínio real
sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' k8s/05-ingress.yaml
```

### 8. Deploy no AKS
```bash
# Aplicar todos os manifestos em ordem
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secret.yaml  # Pular se usar Key Vault
kubectl apply -f k8s/03-deployment.yaml
kubectl apply -f k8s/04-service.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-hpa.yaml
kubectl apply -f k8s/07-pdb.yaml

# Ou aplicar todos de uma vez
kubectl apply -f k8s/
```

### 9. Verificar deploy
```bash
# Ver status dos pods
kubectl get pods -n lead-score

# Ver logs
kubectl logs -f deployment/lead-score-app -n lead-score

# Ver detalhes do deployment
kubectl describe deployment lead-score-app -n lead-score

# Ver serviços
kubectl get svc -n lead-score

# Ver ingress
kubectl get ingress -n lead-score
```

### 10. Configurar Ingress Controller (se necessário)
```bash
# Instalar NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Ou instalar via Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx
```

### 11. Configurar DNS
```bash
# Obter IP público do Ingress
kubectl get svc -n ingress-nginx

# Criar registro A no DNS apontando para o IP do LoadBalancer
```

## Atualizações

### Atualizar imagem
```bash
# Build nova versão
docker build -t <ACR_NAME>.azurecr.io/lead-score:v1.0.1 .
docker push <ACR_NAME>.azurecr.io/lead-score:v1.0.1

# Atualizar deployment
kubectl set image deployment/lead-score-app \
  lead-score=<ACR_NAME>.azurecr.io/lead-score:v1.0.1 \
  -n lead-score

# Ou editar deployment
kubectl edit deployment lead-score-app -n lead-score

# Ver status do rollout
kubectl rollout status deployment/lead-score-app -n lead-score
```

### Rollback
```bash
# Ver histórico
kubectl rollout history deployment/lead-score-app -n lead-score

# Rollback para versão anterior
kubectl rollout undo deployment/lead-score-app -n lead-score

# Rollback para versão específica
kubectl rollout undo deployment/lead-score-app --to-revision=2 -n lead-score
```

## Monitoramento

### Logs
```bash
# Logs em tempo real
kubectl logs -f deployment/lead-score-app -n lead-score

# Logs de todos os pods
kubectl logs -l app=lead-score -n lead-score --tail=100
```

### Métricas
```bash
# Ver uso de recursos
kubectl top pods -n lead-score
kubectl top nodes

# Ver status do HPA
kubectl get hpa -n lead-score
```

### Debug
```bash
# Entrar no container
kubectl exec -it deployment/lead-score-app -n lead-score -- sh

# Port forward para teste local
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score

# Descrever pod com problemas
kubectl describe pod <POD_NAME> -n lead-score

# Ver eventos
kubectl get events -n lead-score --sort-by='.lastTimestamp'
```

## Limpeza
```bash
# Deletar todos os recursos
kubectl delete namespace lead-score

# Ou deletar recursos individualmente
kubectl delete -f k8s/
```

## CI/CD (GitHub Actions exemplo)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AKS

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Build and push image
      run: |
        az acr build \
          --registry ${{ secrets.ACR_NAME }} \
          --image lead-score:${{ github.sha }} \
          --image lead-score:latest \
          .
    
    - name: Set AKS context
      uses: azure/aks-set-context@v3
      with:
        resource-group: ${{ secrets.RESOURCE_GROUP }}
        cluster-name: ${{ secrets.AKS_CLUSTER_NAME }}
    
    - name: Deploy to AKS
      run: |
        kubectl set image deployment/lead-score-app \
          lead-score=${{ secrets.ACR_NAME }}.azurecr.io/lead-score:${{ github.sha }} \
          -n lead-score
        kubectl rollout status deployment/lead-score-app -n lead-score
```

## Troubleshooting

### Pod não inicia
```bash
# Ver descrição do pod
kubectl describe pod <POD_NAME> -n lead-score

# Ver logs
kubectl logs <POD_NAME> -n lead-score

# Verificar secrets
kubectl get secrets -n lead-score
kubectl describe secret lead-score-secrets -n lead-score
```

### Problemas de rede
```bash
# Testar conectividade
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Dentro do pod:
wget -O- http://lead-score-service.lead-score.svc.cluster.local

# Ver endpoints
kubectl get endpoints -n lead-score
```

### Imagem não encontrada
```bash
# Verificar se ACR está anexado ao AKS
az aks show --resource-group <RG> --name <AKS> --query "servicePrincipalProfile"

# Recriar anexo
az aks update --resource-group <RG> --name <AKS> --attach-acr <ACR_NAME>
```
