# Lead Score - Estrutura de Containerização

Este documento descreve a estrutura completa de containerização criada para o projeto Lead Score.

## 📁 Estrutura de Arquivos Criados

```
lead-score/
├── Dockerfile                          # Imagem Docker multi-stage otimizada
├── .dockerignore                       # Arquivos ignorados no build
├── docker-compose.yml                  # Orquestração local (app + postgres)
├── .gitignore                          # Arquivos ignorados pelo git
├── README.md                           # Documentação atualizada
├── DEPLOY.md                           # Guia completo de deploy
├── deploy.sh                           # Script automatizado de deploy
├── run-migrations.sh                   # Script para rodar migrations no K8s
├── azure-env.example                   # Template de variáveis do Azure
├── .github/workflows/
│   ├── deploy-aks.yml                 # CI/CD para deploy no AKS
│   └── docker-build.yml               # Build e teste em PRs
└── k8s/                               # Manifestos Kubernetes
    ├── README.md                      # Documentação dos manifestos
    ├── 00-namespace.yaml              # Namespace do projeto
    ├── 01-configmap.yaml              # Configurações não-sensíveis
    ├── 02-secret.yaml                 # Secrets (exemplo)
    ├── 03-deployment.yaml             # Deployment da aplicação
    ├── 04-service.yaml                # Service interno
    ├── 05-ingress.yaml                # Ingress (NGINX e App Gateway)
    ├── 06-hpa.yaml                    # Horizontal Pod Autoscaler
    └── 07-pdb.yaml                    # Pod Disruption Budget
```

## 🚀 Funcionalidades Implementadas

### 1. Dockerfile Multi-stage
- **Stage 1 (Builder)**: Build da aplicação com todas as dependências
- **Stage 2 (Production)**: Imagem final otimizada e enxuta
- **Segurança**: Usuário não-root (nestjs:nodejs)
- **Health check**: Verificação automática de saúde
- **Tamanho**: Imagem Alpine Linux para menor footprint

### 2. Docker Compose
- Aplicação NestJS containerizada
- PostgreSQL 16 Alpine para desenvolvimento local
- Health checks configurados
- Network bridge dedicada
- Variáveis de ambiente do .env
- Restart policy configurado

### 3. Manifestos Kubernetes (Produção)

#### Deployment
- **Replicas**: 2 réplicas mínimas (alta disponibilidade)
- **Rolling Update**: Zero downtime nos deploys
- **Resources**: Requests e limits configurados
- **Probes**: Liveness, readiness e startup
- **Security**: Non-root, capabilities drop

#### Service
- ClusterIP para comunicação interna
- Port 80 exposto internamente

#### Ingress
- Suporte para NGINX Ingress Controller
- Suporte para Azure Application Gateway
- SSL/TLS com cert-manager
- Timeouts configurados

#### HPA (Auto-scaling)
- Min: 2 réplicas
- Max: 10 réplicas
- Target CPU: 70%
- Target Memory: 80%
- Scale down/up policies configuradas

#### PDB (Pod Disruption Budget)
- Mínimo 1 pod disponível durante manutenções

### 4. Scripts de Automação

#### create-k8s-secrets.sh
- **Lê secrets do arquivo .env automaticamente**
- Cria secret no Kubernetes com valores reais
- Valida conexão com cluster
- Suporta múltiplos namespaces
- Seguro: não expõe valores no histórico

#### deploy.sh
- Validação de variáveis de ambiente
- Build e push automático para ACR
- Deploy completo no AKS
- Verificação de status
- Health checks

#### run-migrations.sh
- Executa migrations dentro do cluster
- Encontra automaticamente o pod disponível

### 5. CI/CD (GitHub Actions)

#### docker-build.yml
- Build e teste em Pull Requests
- Validação da imagem Docker
- Cache otimizado

#### deploy-aks.yml
- Build automático no push
- Deploy em produção (branch main)
- Deploy em staging (branch develop)
- Versionamento por SHA
- Rollout automático
- Migrations automáticas

### 6. Endpoint de Health
Adicionado endpoint `/health` no `app.controller.ts`:
- Retorna status e timestamp
- Usado pelos probes do Kubernetes

## 🔧 Como Usar

### Desenvolvimento Local

```bash
# 1. Subir ambiente local
docker-compose up -d

# 2. Ver logs
docker-compose logs -f app

# 3. Acessar aplicação
curl http://localhost:3000/health
```

### Deploy no AKS

```bash
# 1. Configurar ambiente Azure
source azure-env.sh

# 2. Executar deploy
./deploy.sh production v1.0.0

# 3. Verificar
kubectl get pods -n lead-score
```

## 🔐 Segurança

### Implementado
- ✅ Usuário não-root nos containers
- ✅ Read-only filesystem onde possível
- ✅ Capabilities drop (ALL)
- ✅ Security context configurado
- ✅ Health checks em todas as camadas
- ✅ Resource limits definidos
- ✅ Network policies isoladas

### Recomendações para Produção
- 🔒 **Azure Key Vault**: Usar para gerenciar secrets
- 🔒 **Managed Identity**: Autenticação sem senhas
- 🔒 **Network Policies**: Isolar comunicação entre pods
- 🔒 **Pod Security Standards**: Aplicar padrões de segurança
- 🔒 **Image Scanning**: Escanear vulnerabilidades na imagem
- 🔒 **RBAC**: Controle de acesso granular

## 📊 Monitoramento

### Métricas Disponíveis
- CPU e memória (HPA)
- Health checks (probes)
- Logs centralizados (kubectl logs)

### Recomendações
- **Azure Monitor**: Monitoramento completo do AKS
- **Application Insights**: APM da aplicação
- **Prometheus**: Métricas customizadas
- **Grafana**: Dashboards visuais

## 🔄 Atualizações

### Atualizar versão
```bash
# Build nova versão
docker build -t <ACR>.azurecr.io/lead-score:v1.0.1 .
docker push <ACR>.azurecr.io/lead-score:v1.0.1

# Deploy
kubectl set image deployment/lead-score-app \
  lead-score=<ACR>.azurecr.io/lead-score:v1.0.1 \
  -n lead-score
```

### Rollback
```bash
kubectl rollout undo deployment/lead-score-app -n lead-score
```

## 🎯 Próximos Passos

1. **Configurar Azure Key Vault**
   - Migrar secrets do arquivo para Key Vault
   - Configurar CSI Driver
   - Atualizar deployment

2. **Configurar domínio e SSL**
   - Adicionar domínio no DNS
   - Configurar cert-manager
   - Atualizar ingress

3. **Configurar monitoramento**
   - Habilitar Azure Monitor
   - Integrar Application Insights
   - Configurar alertas

4. **Configurar CI/CD**
   - Adicionar secrets no GitHub
   - Criar Azure Service Principal
   - Testar pipeline

5. **Otimizações**
   - Cache de dependências no build
   - Otimizar recursos (requests/limits)
   - Configurar node affinity
   - Adicionar prometheus metrics

## 📚 Recursos

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [AKS Documentation](https://learn.microsoft.com/azure/aks/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [NestJS Deployment](https://docs.nestjs.com/deployment)

## 💡 Dicas

1. **Sempre teste localmente primeiro**: Use docker-compose antes de fazer deploy
2. **Use tags versionadas**: Evite usar apenas `latest` em produção
3. **Monitore os recursos**: Ajuste requests/limits baseado no uso real
4. **Faça backup**: Configure backup do banco de dados
5. **Documente mudanças**: Mantenha changelog atualizado

## 🐛 Troubleshooting

Ver guia completo em [DEPLOY.md](./DEPLOY.md) seção "Troubleshooting".

## ✅ Checklist de Deploy

- [ ] Configurar ACR
- [ ] Criar cluster AKS
- [ ] Configurar Azure Key Vault
- [ ] Adicionar secrets no Key Vault
- [ ] Configurar domínio DNS
- [ ] Configurar SSL/TLS
- [ ] Testar build local
- [ ] Fazer deploy em staging
- [ ] Rodar migrations
- [ ] Testar aplicação em staging
- [ ] Deploy em produção
- [ ] Configurar monitoramento
- [ ] Configurar alertas
- [ ] Documentar runbooks
