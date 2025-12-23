/* eslint-disable no-console */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// NOTE: These imports will exist later when we create entities.
// This seed script will work after we add the entities and DB config.
// For now it safely scaffolds the seed runner.
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function createDataSource(): Promise<DataSource> {
  const host = required('DB_HOST');
  const port = Number(required('DB_PORT'));
  const username = required('DB_USERNAME');
  const password = required('DB_PASSWORD');
  const database = required('DB_NAME');

  const ds = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    // Works for ts-node and built JS
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../src/database/migrations/*{.ts,.js}'],
  });

  return ds;
}

async function main() {
  console.log('🔧 Running dev seed...');

  const ds = await createDataSource();
  await ds.initialize();

  try {
    // Minimal seed placeholder.
    // We will replace/enhance this when we build all entities and modules.
    // Example future seeds:
    // - create a demo school
    // - create principal/teacher/student demo users
    // - create class-sections

    console.log('✅ Connected to DB. (Seed logic will be expanded later)');
  } finally {
    await ds.destroy();
  }

  console.log('✅ Dev seed complete');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
