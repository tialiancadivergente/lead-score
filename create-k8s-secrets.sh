#!/bin/bash

# Script para criar secrets no Kubernetes a partir do arquivo .env
# Uso: ./create-k8s-secrets.sh [namespace]

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Namespace (padrão: lead-score)
NAMESPACE=${1:-lead-score}
SECRET_NAME="lead-score-secrets"

echo -e "${GREEN}=== Creating Kubernetes Secrets from .env ===${NC}"
echo "Namespace: $NAMESPACE"
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file first"
    exit 1
fi

# Verificar se está conectado ao cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Not connected to Kubernetes cluster${NC}"
    echo "Please run: az aks get-credentials --resource-group <RG> --name <AKS>"
    exit 1
fi

# Criar namespace se não existir
echo -e "${YELLOW}Checking namespace...${NC}"
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Creating namespace $NAMESPACE..."
    kubectl create namespace $NAMESPACE
fi
echo -e "${GREEN}✓ Namespace ready${NC}"
echo ""

# Deletar secret existente (se houver)
if kubectl get secret $SECRET_NAME -n $NAMESPACE &> /dev/null; then
    echo -e "${YELLOW}Deleting existing secret...${NC}"
    kubectl delete secret $SECRET_NAME -n $NAMESPACE
fi

# Lista de variáveis sensíveis que devem ser secrets
SENSITIVE_VARS=(
    "DB_USER"
    "DB_PASSWORD"
    "SERVICE_BUS_CONNECTION_STRING"
    "ACTIVECAMPAIGN_API_TOKEN"
    "INTERNAL_API_KEY"
)

# Construir comando kubectl create secret
echo -e "${YELLOW}Creating secrets from .env...${NC}"

SECRET_ARGS=""
for VAR in "${SENSITIVE_VARS[@]}"; do
    # Extrair valor do .env
    VALUE=$(grep "^${VAR}=" .env | cut -d'=' -f2-)
    
    if [ -n "$VALUE" ]; then
        SECRET_ARGS="$SECRET_ARGS --from-literal=${VAR}=${VALUE}"
        echo "  ✓ Added $VAR"
    else
        echo -e "  ${YELLOW}⚠ Warning: $VAR not found in .env${NC}"
    fi
done

# Criar secret
if [ -n "$SECRET_ARGS" ]; then
    kubectl create secret generic $SECRET_NAME $SECRET_ARGS -n $NAMESPACE
    echo ""
    echo -e "${GREEN}✓ Secrets created successfully!${NC}"
    echo ""
    
    # Mostrar informações do secret (sem valores)
    echo "Secret details:"
    kubectl describe secret $SECRET_NAME -n $NAMESPACE
else
    echo -e "${RED}Error: No secrets to create${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Done ===${NC}"
echo ""
echo "To verify secrets:"
echo "  kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "To view secret keys (not values):"
echo "  kubectl describe secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "To delete secrets:"
echo "  kubectl delete secret $SECRET_NAME -n $NAMESPACE"
