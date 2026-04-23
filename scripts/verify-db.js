require('dotenv').config();
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'lead_score',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

(async () => {
  const c = new Client(cfg);
  await c.connect();

  const tables = await c.query(
    "select tablename from pg_catalog.pg_tables where schemaname='public' order by tablename;",
  );
  const fk = await c.query(
    "select count(*)::int as fk_count from information_schema.table_constraints where constraint_type='FOREIGN KEY' and table_schema='public';",
  );
  const migrations = await c.query(
    "select count(*)::int as migrations_count from public.migrations;",
  );

  console.log('DB_CFG', { ...cfg, password: '***' });
  console.log('TABLES_COUNT', tables.rowCount);
  console.log('TABLES', tables.rows.map((x) => x.tablename));
  console.log('FK_COUNT', fk.rows[0].fk_count);
  console.log('MIGRATIONS_COUNT', migrations.rows[0].migrations_count);

  await c.end();
})().catch((e) => {
  console.error('VERIFY_DB_ERROR', e);
  process.exit(1);
});

