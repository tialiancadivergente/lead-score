#!/bin/bash

set -euo pipefail

export AKS_CLUSTER_NAME="lead-score-aks"
export RESOURCE_GROUP="lead-score-rg"
export ACR_NAME="leadscoreacr"

VERSION="$(node -p "require('./package.json').version")"

if [ -z "$VERSION" ]; then
    echo "Error: package.json version not found"
    exit 1
fi

./deploy.sh production "v${VERSION}" --skip-ingress
