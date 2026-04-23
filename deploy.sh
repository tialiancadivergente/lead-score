#!/bin/bash

# Script de deploy para AKS
# Uso: ./deploy.sh <environment> <version> [--skip-ingress] [--install-ingress-controller]
# Exemplo: ./deploy.sh production v1.0.0
# Exemplo: ./deploy.sh production v1.0.0 --install-ingress-controller

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
ENVIRONMENT=${1:-development}
VERSION=${2:-latest}
ACR_NAME=${ACR_NAME:-""}
RESOURCE_GROUP=${RESOURCE_GROUP:-""}
AKS_CLUSTER_NAME=${AKS_CLUSTER_NAME:-""}

# Flags
SKIP_INGRESS=false
INSTALL_INGRESS_CONTROLLER=false
SKIP_BUILD=false

# Parse argumentos
for arg in "$@"; do
    case $arg in
        --skip-ingress)
            SKIP_INGRESS=true
            shift
            ;;
        --install-ingress-controller)
            INSTALL_INGRESS_CONTROLLER=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
    esac
done

echo -e "${GREEN}=== Lead Score - Deploy to AKS ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Skip Ingress: $SKIP_INGRESS"
echo "Install Ingress Controller: $INSTALL_INGRESS_CONTROLLER"
echo "Skip Build: $SKIP_BUILD"
echo ""

# Validar variáveis
if [ -z "$ACR_NAME" ]; then
    echo -e "${RED}Error: ACR_NAME not set${NC}"
    echo "Set environment variable: export ACR_NAME=your-acr-name"
    exit 1
fi

if [ -z "$RESOURCE_GROUP" ]; then
    echo -e "${RED}Error: RESOURCE_GROUP not set${NC}"
    echo "Set environment variable: export RESOURCE_GROUP=your-resource-group"
    exit 1
fi

if [ -z "$AKS_CLUSTER_NAME" ]; then
    echo -e "${RED}Error: AKS_CLUSTER_NAME not set${NC}"
    echo "Set environment variable: export AKS_CLUSTER_NAME=your-aks-cluster"
    exit 1
fi

# Verificar se está logado no Azure
echo -e "${YELLOW}Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure. Please run: az login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Azure login verified${NC}"

# Build e push da imagem
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}Building and pushing image to ACR...${NC}"
    az acr build \
        --registry $ACR_NAME \
        --image lead-score:$VERSION \
        --image lead-score:latest \
        --file Dockerfile \
        .
    echo -e "${GREEN}✓ Image pushed to ACR${NC}"
else
    echo -e "${BLUE}Skipping image build (--skip-build flag)${NC}"
fi

# Conectar ao cluster AKS
echo -e "${YELLOW}Connecting to AKS cluster...${NC}"
az aks get-credentials \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER_NAME \
    --overwrite-existing
echo -e "${GREEN}✓ Connected to AKS${NC}"

# Patch retina-agent DaemonSet (reduz resources e afrouxa nodeAffinity)
echo -e "${YELLOW}Patching retina-agent DaemonSet...${NC}"
if kubectl get daemonset retina-agent -n kube-system &> /dev/null; then
    kubectl patch daemonset retina-agent -n kube-system \
        --type json \
        --patch-file k8s/cluster/retina-agent-patch.json
    echo -e "${GREEN}✓ retina-agent patched${NC}"
else
    echo -e "${BLUE}retina-agent DaemonSet not found, skipping patch${NC}"
fi

# Verificar se namespace existe
echo -e "${YELLOW}Checking namespace...${NC}"
if ! kubectl get namespace lead-score &> /dev/null; then
    echo "Creating namespace..."
    kubectl apply -f k8s/00-namespace.yaml
fi
echo -e "${GREEN}✓ Namespace ready${NC}"

# Aplicar ConfigMap
echo -e "${YELLOW}Applying ConfigMap...${NC}"
kubectl apply -f k8s/01-configmap.yaml
echo -e "${GREEN}✓ ConfigMap applied${NC}"

# Verificar se secrets existem
echo -e "${YELLOW}Checking secrets...${NC}"
if ! kubectl get secret lead-score-secrets -n lead-score &> /dev/null; then
    echo -e "${YELLOW}Warning: Secrets not found.${NC}"
    echo ""
    read -p "Create secrets from .env file? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f ./create-k8s-secrets.sh ]; then
            echo -e "${YELLOW}Creating secrets from .env...${NC}"
            ./create-k8s-secrets.sh
            echo -e "${GREEN}✓ Secrets created${NC}"
        else
            echo -e "${RED}Error: create-k8s-secrets.sh not found${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Skipping secrets creation. Deploy may fail if secrets are required.${NC}"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓ Secrets found${NC}"
fi

# Atualizar deployment com a nova versão da imagem
echo -e "${YELLOW}Updating deployment...${NC}"
kubectl apply -f k8s/03-deployment.yaml
kubectl set image deployment/lead-score-app \
    lead-score=$ACR_NAME.azurecr.io/lead-score:$VERSION \
    -n lead-score
echo -e "${GREEN}✓ Deployment updated${NC}"

# Aplicar Service
echo -e "${YELLOW}Applying Service...${NC}"
kubectl apply -f k8s/04-service.yaml
echo -e "${GREEN}✓ Service applied${NC}"

# Verificar e instalar Ingress Controller (se solicitado)
if [ "$INSTALL_INGRESS_CONTROLLER" = true ]; then
    echo -e "${YELLOW}Checking for Ingress Controller...${NC}"
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        echo -e "${YELLOW}Installing NGINX Ingress Controller...${NC}"
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        echo -e "${YELLOW}Waiting for Ingress Controller to be ready...${NC}"
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
        echo -e "${GREEN}✓ Ingress Controller installed${NC}"
        
        # Mostrar IP externo
        echo ""
        echo -e "${BLUE}Getting external IP (this may take a few minutes)...${NC}"
        kubectl get svc -n ingress-nginx
    else
        echo -e "${GREEN}✓ Ingress Controller already installed${NC}"
    fi
    echo ""
fi

# Aplicar Ingress
if [ "$SKIP_INGRESS" = false ]; then
    echo -e "${YELLOW}Applying Ingress...${NC}"
    if kubectl apply -f k8s/05-ingress.yaml; then
        echo -e "${GREEN}✓ Ingress applied${NC}"
        echo ""
        echo -e "${BLUE}Note: To access the application via Ingress, you need to:${NC}"
        echo "  1. Get the external IP: kubectl get svc -n ingress-nginx"
        echo "  2. Configure DNS to point to that IP"
        echo "  3. Update the domain in k8s/05-ingress.yaml"
        echo ""
    else
        echo -e "${YELLOW}⚠ Ingress failed to apply (this is OK if Ingress Controller is not installed)${NC}"
        echo "  You can skip ingress with: ./deploy.sh $ENVIRONMENT $VERSION --skip-ingress"
        echo ""
    fi
else
    echo -e "${BLUE}Skipping Ingress (--skip-ingress flag)${NC}"
    echo -e "${BLUE}To access the application, use port-forward:${NC}"
    echo "  kubectl port-forward svc/lead-score-service 3000:80 -n lead-score"
    echo ""
fi

# Aplicar HPA
echo -e "${YELLOW}Applying HPA...${NC}"
kubectl apply -f k8s/06-hpa.yaml
echo -e "${GREEN}✓ HPA applied${NC}"

# Aplicar PDB
echo -e "${YELLOW}Applying PDB...${NC}"
kubectl apply -f k8s/07-pdb.yaml
echo -e "${GREEN}✓ PDB applied${NC}"

# Aguardar rollout
echo -e "${YELLOW}Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/lead-score-app -n lead-score --timeout=5m
echo -e "${GREEN}✓ Rollout completed${NC}"

# Verificar status
echo -e "${YELLOW}Checking deployment status...${NC}"
kubectl get pods -n lead-score
echo ""
kubectl get svc -n lead-score
echo ""
kubectl get ingress -n lead-score
echo ""

echo -e "${GREEN}=== Deploy completed successfully! ===${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/lead-score-app -n lead-score"
echo ""
echo "Check status:"
echo "  kubectl get pods -n lead-score"
echo ""
echo "Access application (port-forward):"
echo "  kubectl port-forward svc/lead-score-service 3000:80 -n lead-score"
echo "  Then access: http://localhost:3000/health"
echo ""
if [ "$SKIP_INGRESS" = false ]; then
    echo "Check Ingress:"
    echo "  kubectl get ingress -n lead-score"
    echo "  kubectl describe ingress lead-score-ingress -n lead-score"
    echo ""
fi
echo "Run migrations:"
echo "  ./run-migrations.sh"
echo ""
