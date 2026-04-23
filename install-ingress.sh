#!/bin/bash

# Script para instalar NGINX Ingress Controller no AKS
# Uso: ./install-ingress.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Installing NGINX Ingress Controller ===${NC}"
echo ""

# Verificar se está conectado ao cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Not connected to Kubernetes cluster${NC}"
    echo "Please run: az aks get-credentials --resource-group <RG> --name <AKS>"
    exit 1
fi

# Verificar se já está instalado
if kubectl get namespace ingress-nginx &> /dev/null; then
    echo -e "${YELLOW}NGINX Ingress Controller is already installed.${NC}"
    echo ""
    read -p "Reinstall? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping installation."
        exit 0
    fi
    echo -e "${YELLOW}Deleting existing installation...${NC}"
    kubectl delete namespace ingress-nginx
fi

# Instalar NGINX Ingress Controller
echo -e "${YELLOW}Installing NGINX Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Aguardar estar pronto
echo -e "${YELLOW}Waiting for Ingress Controller to be ready (this may take a few minutes)...${NC}"
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=300s || {
        echo -e "${RED}Timeout waiting for Ingress Controller${NC}"
        echo "Check status with: kubectl get pods -n ingress-nginx"
        exit 1
    }

echo -e "${GREEN}✓ NGINX Ingress Controller installed successfully!${NC}"
echo ""

# Aguardar LoadBalancer obter IP externo
echo -e "${YELLOW}Waiting for external IP (this may take a few minutes)...${NC}"
EXTERNAL_IP=""
for i in {1..60}; do
    EXTERNAL_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$EXTERNAL_IP" ]; then
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

if [ -n "$EXTERNAL_IP" ]; then
    echo -e "${GREEN}✓ External IP assigned: $EXTERNAL_IP${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Configure your DNS:"
    echo "   Create an A record pointing to: $EXTERNAL_IP"
    echo "   Example: lead-score.yourdomain.com -> $EXTERNAL_IP"
    echo ""
    echo "2. Update the domain in k8s/05-ingress.yaml:"
    echo "   sed -i '' 's/yourdomain.com/youractual.com/g' k8s/05-ingress.yaml"
    echo ""
    echo "3. Apply the ingress:"
    echo "   kubectl apply -f k8s/05-ingress.yaml"
    echo ""
    echo "4. (Optional) Install cert-manager for SSL:"
    echo "   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
else
    echo -e "${YELLOW}External IP not yet assigned. Check with:${NC}"
    echo "  kubectl get svc -n ingress-nginx --watch"
fi

echo ""
echo -e "${GREEN}=== Installation complete ===${NC}"
echo ""
echo "View Ingress Controller status:"
echo "  kubectl get all -n ingress-nginx"
echo ""
echo "View services:"
echo "  kubectl get svc -n ingress-nginx"
