#!/bin/bash

# Script de teste local do Docker
# Testa o build da imagem Docker localmente

set -e

echo "=== Lead Score - Local Docker Test ==="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Nome da imagem
IMAGE_NAME="lead-score:local-test"

# Build da imagem
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t $IMAGE_NAME .
echo -e "${GREEN}✓ Image built successfully${NC}"
echo ""

# Informações da imagem
echo -e "${YELLOW}Image details:${NC}"
docker images $IMAGE_NAME
echo ""

# Verificar tamanho
SIZE=$(docker images $IMAGE_NAME --format "{{.Size}}")
echo -e "${GREEN}Image size: $SIZE${NC}"
echo ""

# Opcional: testar execução
read -p "Do you want to test run the container? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting container...${NC}"
    
    # Verificar se .env existe
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        echo "Please create .env file from env.example"
        exit 1
    fi
    
    # Rodar container
    docker run -d \
        --name lead-score-test \
        -p 3000:3000 \
        --env-file .env \
        $IMAGE_NAME
    
    echo -e "${GREEN}✓ Container started${NC}"
    echo ""
    
    # Aguardar um pouco
    echo -e "${YELLOW}Waiting for application to start...${NC}"
    sleep 5
    
    # Testar health check
    echo -e "${YELLOW}Testing health endpoint...${NC}"
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        echo "Response:"
        curl -s http://localhost:3000/health | json_pp || curl -s http://localhost:3000/health
    else
        echo -e "${RED}✗ Health check failed${NC}"
    fi
    echo ""
    
    # Mostrar logs
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs lead-score-test
    echo ""
    
    # Parar e remover container
    read -p "Stop and remove container? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop lead-score-test
        docker rm lead-score-test
        echo -e "${GREEN}✓ Container stopped and removed${NC}"
    else
        echo "Container is still running. To stop it, run:"
        echo "  docker stop lead-score-test"
        echo "  docker rm lead-score-test"
    fi
fi

echo ""
echo -e "${GREEN}=== Test completed ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Test with docker-compose: docker-compose up -d"
echo "  2. Push to ACR: docker tag $IMAGE_NAME <ACR>.azurecr.io/lead-score:latest"
echo "  3. Deploy to AKS: ./deploy.sh production v1.0.0"
