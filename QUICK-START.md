# Guia Rápido de Deploy

## 📦 Scripts Disponíveis

### 1. `deploy.sh` - Deploy completo
Deploy principal da aplicação no AKS

**Sintaxe:**
```bash
./deploy.sh <environment> <version> [flags]
```

**Flags disponíveis:**
- `--skip-ingress` - Pula a configuração do ingress
- `--install-ingress-controller` - Instala NGINX Ingress Controller automaticamente
- `--skip-build` - Pula o build da imagem (usa versão já no ACR)

**Exemplos:**

```bash
# Deploy básico sem ingress (recomendado para primeira vez)
./deploy.sh production v1.0.0 --skip-ingress

# Deploy completo instalando ingress controller
./deploy.sh production v1.0.0 --install-ingress-controller

# Deploy rápido sem rebuild (apenas atualiza manifests)
./deploy.sh production v1.0.0 --skip-build --skip-ingress

# Deploy completo com tudo
./deploy.sh production v1.0.0 --install-ingress-controller
```

### 2. `create-k8s-secrets.sh` - Criar secrets
Cria secrets no Kubernetes a partir do arquivo `.env`

```bash
# Criar secrets no namespace padrão (lead-score)
./create-k8s-secrets.sh

# Criar secrets em namespace específico
./create-k8s-secrets.sh lead-score-staging
```

### 3. `install-ingress.sh` - Instalar Ingress Controller
Instala NGINX Ingress Controller no cluster AKS

```bash
./install-ingress.sh
```

### 4. `run-migrations.sh` - Rodar migrations
Executa migrations do banco de dados dentro do pod

```bash
./run-migrations.sh
```

### 5. `test-docker.sh` - Testar build local
Testa o build da imagem Docker localmente

```bash
./test-docker.sh
```

---

## 🚀 Fluxo de Deploy Completo

### Primeira Vez (sem ingress)

```bash
# 1. Configurar ambiente
source azure-env.sh

# 2. Conectar ao cluster
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME

# 3. Criar secrets
./create-k8s-secrets.sh

# 4. Deploy (sem ingress)
./deploy.sh production v1.0.0 --skip-ingress

# 5. Verificar
kubectl get pods -n lead-score
kubectl logs -f deployment/lead-score-app -n lead-score

# 6. Testar localmente
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score
# Em outro terminal:
curl http://localhost:3000/health

# 7. Rodar migrations
./run-migrations.sh
```

### Segunda Vez (com ingress)

```bash
# 1. Instalar ingress controller
./install-ingress.sh
# Anotar o EXTERNAL_IP

# 2. Configurar DNS
# Criar registro A: lead-score.seudominio.com -> EXTERNAL_IP

# 3. Atualizar domínio no ingress
sed -i '' 's/yourdomain.com/seudominio.com/g' k8s/05-ingress.yaml

# 4. Deploy com ingress
./deploy.sh production v1.0.1

# 5. Verificar ingress
kubectl get ingress -n lead-score
curl http://lead-score.seudominio.com/health
```

### Deploy Rápido (atualização)

```bash
# Apenas atualizar código (rebuild)
./deploy.sh production v1.0.2 --skip-ingress

# Ou apenas atualizar manifests (sem rebuild)
./deploy.sh production latest --skip-build --skip-ingress
```

---

## 🔧 Comandos Úteis

### Ver logs
```bash
kubectl logs -f deployment/lead-score-app -n lead-score
```

### Ver status
```bash
kubectl get pods -n lead-score
kubectl get all -n lead-score
```

### Port-forward
```bash
kubectl port-forward svc/lead-score-service 3000:80 -n lead-score
```

### Escalar pods
```bash
kubectl scale deployment lead-score-app --replicas=3 -n lead-score
```

### Atualizar imagem manualmente
```bash
kubectl set image deployment/lead-score-app \
  lead-score=leadscoreacr.azurecr.io/lead-score:v1.0.3 \
  -n lead-score
```

### Rollback
```bash
kubectl rollout undo deployment/lead-score-app -n lead-score
```

### Verificar HPA
```bash
kubectl get hpa -n lead-score
kubectl describe hpa lead-score-hpa -n lead-score
```

### Ver eventos
```bash
kubectl get events -n lead-score --sort-by='.lastTimestamp'
```

### Debug de pod
```bash
kubectl describe pod <POD_NAME> -n lead-score
kubectl exec -it <POD_NAME> -n lead-score -- sh
```

---

## 🆘 Troubleshooting

### Pod não inicia
```bash
kubectl describe pod <POD_NAME> -n lead-score
kubectl logs <POD_NAME> -n lead-score
```

### Erro de imagem
```bash
# Verificar se ACR está anexado
az aks show -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --query "servicePrincipalProfile"

# Reanexar ACR
az aks update -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --attach-acr $ACR_NAME
```

### Secrets não encontrados
```bash
# Verificar secrets
kubectl get secret -n lead-score
kubectl describe secret lead-score-secrets -n lead-score

# Recriar secrets
./create-k8s-secrets.sh
```

### Ingress não funciona
```bash
# Verificar ingress controller
kubectl get pods -n ingress-nginx

# Verificar ingress
kubectl describe ingress lead-score-ingress -n lead-score

# Ver logs do ingress controller
kubectl logs -f -n ingress-nginx -l app.kubernetes.io/component=controller
```

---

## 📊 Variáveis de Ambiente

Certifique-se de ter estas variáveis configuradas:

```bash
export ACR_NAME=leadscoreacr
export RESOURCE_GROUP=lead-score-rg
export AKS_CLUSTER_NAME=lead-score-aks
```

Ou use o arquivo `azure-env.sh`:
```bash
source azure-env.sh
```

---

## ✅ Checklist

- [ ] Azure CLI instalado e configurado
- [ ] kubectl instalado
- [ ] Docker instalado (para builds locais)
- [ ] ACR criado
- [ ] AKS criado
- [ ] ACR anexado ao AKS
- [ ] Arquivo `.env` configurado
- [ ] Variáveis de ambiente carregadas (`source azure-env.sh`)
- [ ] Conectado ao cluster AKS
- [ ] Secrets criados no Kubernetes
- [ ] Deploy realizado
- [ ] Pods rodando
- [ ] Migrations executadas
- [ ] Aplicação testada

---

Para mais detalhes, consulte:
- [DEPLOY.md](./DEPLOY.md) - Guia completo de deploy
- [CONTAINERIZATION.md](./CONTAINERIZATION.md) - Estrutura e arquitetura
- [README.md](./README.md) - Documentação geral
