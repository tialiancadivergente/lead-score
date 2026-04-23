import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsEnabled =
    (process.env.CORS_ENABLED ?? 'true').toLowerCase() === 'true';
  if (corsEnabled) {
    const corsOrigins = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    app.enableCors({
      origin: corsOrigins.length ? corsOrigins : true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
      credentials:
        (process.env.CORS_CREDENTIALS ?? 'false').toLowerCase() === 'true',
      optionsSuccessStatus: 204,
    });
  }

  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() === 'true';
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
