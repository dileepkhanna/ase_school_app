/* eslint-disable no-console */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

dotenv.config();

/**
 * Usage:
 *  npx ts-node scripts/create.admin.ts --email=admin@ase.com --password=Admin@1234
 *
 * Creates a global ASE_ADMIN user (not tied to any school).
 * This will be used later for the ASE Admin Panel (web).
 */

type Args = Record<string, string>;

function parseArgs(): Args {
  const args: Args = {};
  for (const raw of process.argv.slice(2)) {
    const [k, ...rest] = raw.replace(/^--/, '').split('=');
    if (!k) continue;
    args[k] = rest.join('=') ?? '';
  }
  return args;
}

function requiredArg(args: Args, name: string): string {
  const v = args[name];
  if (!v) throw new Error(`Missing required argument: --${name}=...`);
  return v;
}

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function createDataSource(): Promise<DataSource> {
  const host = requiredEnv('DB_HOST');
  const port = Number(requiredEnv('DB_PORT'));
  const username = requiredEnv('DB_USERNAME');
  const password = requiredEnv('DB_PASSWORD');
  const database = requiredEnv('DB_NAME');

  return new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../src/database/migrations/*{.ts,.js}'],
  });
}

async function main() {
  const args = parseArgs();
  const email = requiredArg(args, 'email').trim().toLowerCase();
  const passwordPlain = requiredArg(args, 'password');

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '12');
  const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

  const ds = await createDataSource();
  await ds.initialize();

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../src/modules/users/entities/user.entity');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Role } = require('../src/common/enums/role.enum');

    const userRepo = ds.getRepository<typeof User>(User);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      console.log('ℹ️ Admin already exists:', { id: existing.id, email: existing.email });
      return;
    }

    const admin = userRepo.create({
      email,
      passwordHash,
      role: Role.ASE_ADMIN,
      mustChangePassword: false,
      biometricsEnabled: false,
      isActive: true,
      // not tied to any school
      schoolId: null,
      schoolCode: null,
      phone: null,
    });

    const saved = await userRepo.save(admin);

    console.log('✅ ASE Admin created:', { id: saved.id, email: saved.email, role: saved.role });
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('❌ create.admin failed:', err);
  process.exit(1);
});
