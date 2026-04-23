<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Descrição

API em NestJS com **PostgreSQL (TypeORM)** e **Azure Service Bus**.

## Setup do projeto

```bash
$ npm install
```

## Variáveis de ambiente

Como este ambiente bloqueia arquivos iniciados com ponto, o template está em `env.example`.

- Copie `env.example` para `.env` (localmente) e preencha os valores.

Principais variáveis:

- **Swagger**: `SWAGGER_ENABLED=true` e `SWAGGER_PATH=docs` (documentação em `http://localhost:3000/docs`)
- **Postgres**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **SSL/UUID** (Azure Postgres geralmente exige): `DB_SSL=true` e `DB_UUID_EXTENSION=pgcrypto`
- **Service Bus**: `SERVICE_BUS_CONNECTION_STRING`, `SERVICE_BUS_LEAD_SCORE_QUEUE`
- **Consumer**: `SERVICE_BUS_CONSUMER_ENABLED=true` para ativar o worker de exemplo

## Infra local (PostgreSQL)

Suba o Postgres com Docker:

```bash
$ docker compose up -d
```

## Rodar o projeto

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Migrations (TypeORM)

Os scripts usam o `src/database/data-source.ts` e carregam variáveis do `.env`.

```bash
# gerar migration a partir das entidades (ajuste as entidades antes)
$ npm run migration:generate

# aplicar migrations no banco configurado no .env
$ npm run migration:run
```

## Azure Service Bus (exemplo)

- Publisher: use `ServiceBusService.publish(queue, body)`
- Consumer: worker de exemplo em `src/service-bus/workers/lead-score.consumer.ts` (habilite via `SERVICE_BUS_CONSUMER_ENABLED=true`)

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

### Docker

O projeto está containerizado e pronto para rodar em Docker e Azure Kubernetes Service (AKS).

#### Desenvolvimento Local com Docker Compose

```bash
# Subir todos os serviços (app + postgres)
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar serviços
docker-compose down
```

#### Build manual da imagem

```bash
# Build
docker build -t lead-score:local .

# Run
docker run -p 3000:3000 --env-file .env lead-score:local
```

### Deploy no Azure Kubernetes Service (AKS)

Consulte o guia completo em [DEPLOY.md](./DEPLOY.md) para instruções detalhadas.

#### Quick Start

1. **Configurar variáveis de ambiente:**
```bash
cp azure-env.example azure-env.sh
# Edite azure-env.sh com seus valores do Azure
source azure-env.sh
```

2. **Criar secrets do .env no Kubernetes:**
```bash
# Conectar ao cluster AKS
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME

# Criar secrets automaticamente do arquivo .env
./create-k8s-secrets.sh
```

3. **Executar script de deploy:**
```bash
./deploy.sh production v1.0.0
```

4. **Verificar status:**
```bash
kubectl get pods -n lead-score
kubectl logs -f deployment/lead-score-app -n lead-score
```

#### Estrutura Kubernetes

Os manifestos estão em `k8s/`:
- `00-namespace.yaml` - Namespace
- `01-configmap.yaml` - Configurações
- `02-secret.yaml` - Secrets (usar Azure Key Vault em produção)
- `03-deployment.yaml` - Deployment
- `04-service.yaml` - Service
- `05-ingress.yaml` - Ingress
- `06-hpa.yaml` - Auto-scaling
- `07-pdb.yaml` - Pod Disruption Budget

#### CI/CD

GitHub Actions configurado em `.github/workflows/`:
- `docker-build.yml` - Build e teste em PRs
- `deploy-aks.yml` - Deploy automático no AKS

**Secrets necessários no GitHub:**
- `AZURE_CREDENTIALS`
- `ACR_NAME`
- `RESOURCE_GROUP`
- `AKS_CLUSTER_NAME`

### Deploy tradicional (sem container)

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
