# Lead Score - Kubernetes

Este diretório contém os manifestos Kubernetes para deploy da aplicação no Azure Kubernetes Service (AKS).

## Estrutura

- `00-namespace.yaml` - Namespace do projeto
- `01-configmap.yaml` - Configurações não-sensíveis
- `02-secret.yaml` - Secrets (credenciais)
- `03-deployment.yaml` - Deployment da aplicação
- `04-service.yaml` - Service interno
- `05-ingress.yaml` - Ingress para exposição externa
- `06-hpa.yaml` - Horizontal Pod Autoscaler
- `07-pdb.yaml` - Pod Disruption Budget

## Deploy Rápido

```bash
# Aplicar todos os manifestos
kubectl apply -f k8s/

# Verificar status
kubectl get all -n lead-score
```

## Ordem de Deploy

Se precisar aplicar manualmente:

```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secret.yaml
kubectl apply -f 03-deployment.yaml
kubectl apply -f 04-service.yaml
kubectl apply -f 05-ingress.yaml
kubectl apply -f 06-hpa.yaml
kubectl apply -f 07-pdb.yaml
```

## Configurações Importantes

### Deployment (03-deployment.yaml)

- **Replicas**: 2 (mínimo para alta disponibilidade)
- **Resources**: 256Mi-512Mi RAM, 100m-500m CPU
- **Probes**: Health checks configurados
- **Security**: Non-root user, read-only filesystem

### Ingress (05-ingress.yaml)

Duas opções disponíveis:
1. **NGINX Ingress Controller** (padrão)
2. **Application Gateway** (comentado)

Escolha um e ajuste o domínio.

### HPA (06-hpa.yaml)

- **Min replicas**: 2
- **Max replicas**: 10
- **Target CPU**: 70%
- **Target Memory**: 80%

## Secrets

⚠️ **IMPORTANTE**: O arquivo `02-secret.yaml` contém secrets em texto plano apenas como exemplo.

Para produção, use uma das opções:

### Opção 1: Azure Key Vault (Recomendado)
```bash
# Habilitar CSI Driver
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --resource-group <RG> \
  --name <AKS>

# Criar SecretProviderClass
kubectl apply -f - <<EOF
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: lead-score-secrets
  namespace: lead-score
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<IDENTITY_CLIENT_ID>"
    keyvaultName: "<KEY_VAULT_NAME>"
    objects: |
      array:
        - |
          objectName: db-password
          objectType: secret
        - |
          objectName: service-bus-connection
          objectType: secret
    tenantId: "<TENANT_ID>"
EOF
```

### Opção 2: kubectl create secret
```bash
kubectl create secret generic lead-score-secrets \
  --from-literal=DB_USER='...' \
  --from-literal=DB_PASSWORD='...' \
  --namespace lead-score
```

## Monitoramento

```bash
# Logs
kubectl logs -f deployment/lead-score-app -n lead-score

# Status dos pods
kubectl get pods -n lead-score

# HPA status
kubectl get hpa -n lead-score

# Eventos
kubectl get events -n lead-score --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pod não inicia
```bash
kubectl describe pod <POD_NAME> -n lead-score
kubectl logs <POD_NAME> -n lead-score
```

### Ingress não funciona
```bash
# Verificar ingress
kubectl describe ingress lead-score-ingress -n lead-score

# Verificar ingress controller
kubectl get pods -n ingress-nginx
```

### HPA não escala
```bash
# Verificar metrics-server
kubectl get deployment metrics-server -n kube-system

# Instalar se necessário
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```
