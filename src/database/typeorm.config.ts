// import 'reflect-metadata';
// import { DataSource } from 'typeorm';
// import { config as dotenvConfig } from 'dotenv';
// import * as path from 'path';

// dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

// const port = Number(process.env.DB_PORT ?? 5432);

// const dataSource = new DataSource({
//   type: 'postgres',
//   host: process.env.DB_HOST ?? 'localhost',
//   port,
//   username: process.env.DB_USER ?? 'postgres',
//   password: String(process.env.DB_PASS ?? ''), // must be string
//   database: process.env.DB_NAME ?? 'ase_school',

//   synchronize: false,
//   logging: String(process.env.DB_LOGGING ?? 'false') === 'true',

//   entities: [path.resolve(process.cwd(), 'src/**/*.entity.{ts,js}')],
//   migrations: [path.resolve(process.cwd(), 'src/database/migrations/*.{ts,js}')],
//   migrationsTableName: 'typeorm_migrations',
// });

// export default dataSource;










import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';

dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

function env(name: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === null || String(v).trim() === '' ? undefined : String(v);
}

const port = Number(env('DB_PORT') ?? 5432);

const dataSource = new DataSource({
  type: 'postgres',
  host: env('DB_HOST') ?? 'localhost',
  port,

  // Support both naming styles (your code + your .env.example)
  username: env('DB_USERNAME') ?? env('DB_USER') ?? 'postgres',
  password: env('DB_PASSWORD') ?? env('DB_PASS') ?? '',
  database: env('DB_NAME') ?? 'ase_school',

  synchronize: false,
  logging: String(env('DB_LOGGING') ?? 'false') === 'true',

  // Entities/Migrations
  entities: [path.resolve(process.cwd(), 'src/**/*.entity.{ts,js}')],
  migrations: [path.resolve(process.cwd(), 'src/database/migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
});

export default dataSource;
