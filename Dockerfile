# Dockerfile Multi-stage para otimizar o build e reduzir tamanho da imagem

# Stage 1: Build
FROM node:20-alpine AS builder

# Instala dependências necessárias para build
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instala dependências (incluindo devDependencies para o build)
RUN npm ci

# Copia o código fonte
COPY src/ ./src/

# Build da aplicação
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

# Adiciona usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copia apenas o necessário do stage de build
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Muda para usuário não-root
USER nestjs

# Expõe a porta da aplicação
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"]
