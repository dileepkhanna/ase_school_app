/* eslint-disable no-console */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

dotenv.config();

/**
 * Usage:
 *  npx ts-node scripts/create.school+principal.ts \
 *    --schoolCode=ASE001 \
 *    --schoolName="My School" \
 *    --principalEmail="principal@myschool.com" \
 *    --principalPhone="9876543210" \
 *    --tempPassword="Temp@1234" \
 *    --lat=12.9716 --lng=77.5946 --radius=200
 *
 * Notes:
 * - This will work fully after we add School + User entities.
 * - Until then, it is a ready production script scaffold.
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

  const schoolCode = requiredArg(args, 'schoolCode').trim().toUpperCase();
  const schoolName = requiredArg(args, 'schoolName').trim();
  const principalEmail = requiredArg(args, 'principalEmail').trim().toLowerCase();
  const principalPhone = requiredArg(args, 'principalPhone').trim();
  const tempPassword = requiredArg(args, 'tempPassword');

  const lat = args['lat'] ? Number(args['lat']) : undefined;
  const lng = args['lng'] ? Number(args['lng']) : undefined;
  const radius = args['radius'] ? Number(args['radius']) : undefined;

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '12');
  const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

  const ds = await createDataSource();
  await ds.initialize();

  try {
    // Dynamic imports so the script file can exist before entities are created.
    // These will work after we implement the entities in src/modules/schools and src/modules/users.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { School } = require('../src/modules/schools/entities/school.entity');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../src/modules/users/entities/user.entity');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Role } = require('../src/common/enums/role.enum');

    const schoolRepo = ds.getRepository<typeof School>(School);
    const userRepo = ds.getRepository<typeof User>(User);

    const existingSchool = await schoolRepo.findOne({ where: { schoolCode } });
    if (existingSchool) {
      throw new Error(`School already exists with schoolCode=${schoolCode}`);
    }

    const existingPrincipal = await userRepo.findOne({
      where: { email: principalEmail, schoolCode },
    });
    if (existingPrincipal) {
      throw new Error(`Principal already exists for ${schoolCode} + ${principalEmail}`);
    }

    const school = schoolRepo.create({
      schoolCode,
      name: schoolName,
      geofenceLat: lat ?? null,
      geofenceLng: lng ?? null,
      geofenceRadiusM: radius ?? null,
      isActive: true,
    });

    const savedSchool = await schoolRepo.save(school);

    const principal = userRepo.create({
      schoolId: savedSchool.id,
      schoolCode: savedSchool.schoolCode,
      email: principalEmail,
      phone: principalPhone,
      passwordHash,
      role: Role.PRINCIPAL,
      mustChangePassword: true, // First-time setup: reset temp password mandatory
      biometricsEnabled: false,
      isActive: true,
    });

    const savedPrincipal = await userRepo.save(principal);

    console.log('✅ School created:', {
      id: savedSchool.id,
      schoolCode: savedSchool.schoolCode,
      name: savedSchool.name,
      geofence: {
        lat: savedSchool.geofenceLat,
        lng: savedSchool.geofenceLng,
        radiusM: savedSchool.geofenceRadiusM,
      },
    });

    console.log('✅ Principal created:', {
      id: savedPrincipal.id,
      schoolCode: savedPrincipal.schoolCode,
      email: savedPrincipal.email,
      mustChangePassword: savedPrincipal.mustChangePassword,
    });

    console.log('🔐 Temporary password was set. Principal must reset on first login.');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('❌ create.school+principal failed:', err);
  process.exit(1);
});
