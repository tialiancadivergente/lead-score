import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';

loadEnv({ path: ['.env.local', '.env'] });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'lead_score',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  uuidExtension: (process.env.DB_UUID_EXTENSION ?? 'pgcrypto') as
    | 'pgcrypto'
    | 'uuid-ossp',
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
