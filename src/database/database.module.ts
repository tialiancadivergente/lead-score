import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENTITIES } from './entities';

function optionalNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'lead_score'),
        ssl:
          config.get<string>('DB_SSL', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        uuidExtension: config.get<string>('DB_UUID_EXTENSION', 'pgcrypto') as
          | 'pgcrypto'
          | 'uuid-ossp',
        entities: ENTITIES,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        synchronize: config.get<string>('TYPEORM_SYNC', 'false') === 'true',
        logging: config.get<string>('TYPEORM_LOGGING', 'false') === 'true',
        extra: {
          max: optionalNumber(config.get<string>('DB_POOL_MAX'), 10),
          connectionTimeoutMillis: optionalNumber(
            config.get<string>('DB_CONNECTION_TIMEOUT_MS'),
            5_000,
          ),
          idleTimeoutMillis: optionalNumber(
            config.get<string>('DB_IDLE_TIMEOUT_MS'),
            30_000,
          ),
          query_timeout: optionalNumber(
            config.get<string>('DB_QUERY_TIMEOUT_MS'),
            20_000,
          ),
          statement_timeout: optionalNumber(
            config.get<string>('DB_STATEMENT_TIMEOUT_MS'),
            20_000,
          ),
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
