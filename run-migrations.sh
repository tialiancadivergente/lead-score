#!/bin/bash

# Script para rodar migrations no Kubernetes
# Uso: ./run-migrations.sh

set -e

echo "=== Running Database Migrations ==="

# Conectar ao primeiro pod disponível
POD=$(kubectl get pods -n lead-score -l app=lead-score -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo "Error: No pods found"
    exit 1
fi

echo "Using pod: $POD"

# Executar migrations
kubectl exec -it $POD -n lead-score -- npm run migration:run

echo "Migrations completed!"
