import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { securityHeadersMiddleware } from './common/security/security-headers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(securityHeadersMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsEnabled =
    (process.env.CORS_ENABLED ?? 'true').toLowerCase() === 'true';
  if (corsEnabled) {
    const corsOrigins = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    const corsCredentials =
      (process.env.CORS_CREDENTIALS ?? 'false').toLowerCase() === 'true';

    if (isProduction && corsCredentials && corsOrigins.length === 0) {
      throw new Error(
        'CORS_ORIGINS must be configured when CORS_CREDENTIALS=true in production.',
      );
    }

    app.enableCors({
      origin: corsOrigins.length ? corsOrigins : !isProduction,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'x-sync-api-key',
        'x-bootstrap-token',
      ],
      credentials: corsCredentials,
      optionsSuccessStatus: 204,
    });
  }

  const swaggerDefault = isProduction ? 'false' : 'true';
  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? swaggerDefault).toLowerCase() === 'true';
  if (swaggerEnabled) {
    const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';
    const config = new DocumentBuilder()
      .setTitle('Lead Score API')
      .setDescription('Documentacao da API')
      .setVersion(process.env.npm_package_version ?? '0.0.1')
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description:
            'API key interna. Obrigatoria quando API_KEY_ENABLED=true.',
        },
        'x-api-key',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
