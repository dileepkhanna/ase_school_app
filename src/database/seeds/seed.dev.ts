// /* eslint-disable no-console */
// import 'reflect-metadata';
// import * as dotenv from 'dotenv';
// import * as bcrypt from 'bcryptjs';
// import AppDataSource from '../typeorm.config';

// dotenv.config();

// function mustEnv(name: string): string {
//   const v = process.env[name];
//   if (!v) throw new Error(`Missing env: ${name}`);
//   return v;
// }

// async function main() {
//   console.log('🌱 Seeding dev data...');

//   const schoolCode = 'ASE001';
//   const schoolName = 'ASE Demo School';
//   // const principalEmail = 'principal@ase001.com';
//   const principalEmail = 'princetasleemaarif@gmail.com';
//   const principalPhone = '9876543210';
//   const tempPassword = 'Temp@1234';

//   const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '12');
//   const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

//   await AppDataSource.initialize();
//   const qr = AppDataSource.createQueryRunner();
//   await qr.connect();

//   try {
//     await qr.startTransaction();

//     // 1) school
//     const school = await qr.query(
//       `
//       INSERT INTO schools (school_code, name, geofence_lat, geofence_lng, geofence_radius_m, is_active)
//       VALUES ($1, $2, $3, $4, $5, true)
//       ON CONFLICT (school_code) DO UPDATE SET name = EXCLUDED.name
//       RETURNING id, school_code;
//       `,
//       [schoolCode, schoolName, 12.9716, 77.5946, 200],
//     );

//     const schoolId = school[0].id as string;

//     // 2) principal user
//     const existingPrincipal = await qr.query(
//       `SELECT id FROM users WHERE school_id=$1 AND email=$2 LIMIT 1;`,
//       [schoolId, principalEmail],
//     );

//     let principalUserId: string;

//     if (existingPrincipal.length > 0) {
//       principalUserId = existingPrincipal[0].id;
//       console.log('ℹ️ Principal already exists, skipping create:', principalEmail);
//     } else {
//       const principal = await qr.query(
//         `
//         INSERT INTO users (school_id, school_code, role, email, phone, password_hash, must_change_password, biometrics_enabled, is_active)
//         VALUES ($1, $2, 'PRINCIPAL', $3, $4, $5, true, false, true)
//         RETURNING id;
//         `,
//         [schoolId, schoolCode, principalEmail, principalPhone, passwordHash],
//       );
//       principalUserId = principal[0].id as string;
//       console.log('✅ Principal created:', principalEmail);
//       console.log('🔐 Temp password:', tempPassword);
//     }

//     // 3) create 2 demo class sections
//     await qr.query(
//       `
//       INSERT INTO class_sections (school_id, class_number, section)
//       VALUES
//         ($1, 8, 'B'),
//         ($1, 10, 'B')
//       ON CONFLICT DO NOTHING;
//       `,
//       [schoolId],
//     );

//     await qr.commitTransaction();
//     console.log('✅ Dev seed completed');
//     console.log('👉 Demo Login: schoolCode=ASE001 email=principal@ase001.com password=Temp@1234');
//   } catch (e: any) {
//     await qr.rollbackTransaction();
//     console.error('❌ Seed failed:', e?.message ?? e);
//     throw e;
//   } finally {
//     await qr.release();
//     await AppDataSource.destroy();
//   }
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });















/* eslint-disable no-console */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import AppDataSource from '../typeorm.config';

dotenv.config();

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  console.log('🌱 Seeding dev data...');

  const schoolCode = 'ASE001';
  const schoolName = 'ASE Demo School';

  // ✅ Use a REAL inbox so you can receive OTP
  const principalEmail = 'princetasleemaarif@gmail.com';

  const principalPhone = '9876543210';
  const tempPassword = 'Temp@1234';

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '12');
  const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.startTransaction();

    // 1) school
    const school = await qr.query(
      `
      INSERT INTO schools (school_code, name, geofence_lat, geofence_lng, geofence_radius_m, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (school_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, school_code;
      `,
      [schoolCode, schoolName, 12.9716, 77.5946, 200],
    );

    const schoolId = school[0].id as string;

    // 2) principal user
    const existingPrincipal = await qr.query(
      `SELECT id FROM users WHERE school_id=$1 AND email=$2 LIMIT 1;`,
      [schoolId, principalEmail],
    );

    let principalUserId: string;

    if (existingPrincipal.length > 0) {
      principalUserId = existingPrincipal[0].id;
      console.log('ℹ️ Principal already exists, skipping create:', principalEmail);
    } else {
      const principal = await qr.query(
        `
        INSERT INTO users (school_id, school_code, role, email, phone, password_hash, must_change_password, biometrics_enabled, is_active)
        VALUES ($1, $2, 'PRINCIPAL', $3, $4, $5, true, false, true)
        RETURNING id;
        `,
        [schoolId, schoolCode, principalEmail, principalPhone, passwordHash],
      );
      principalUserId = principal[0].id as string;
      console.log('✅ Principal created:', principalEmail);
      console.log('🔐 Temp password:', tempPassword);
    }

    // 3) create 2 demo class sections
    await qr.query(
      `
      INSERT INTO class_sections (school_id, class_number, section)
      VALUES
        ($1, 8, 'B'),
        ($1, 10, 'B')
      ON CONFLICT DO NOTHING;
      `,
      [schoolId],
    );

    await qr.commitTransaction();
    console.log('✅ Dev seed completed');
    console.log(`👉 Demo Login: schoolCode=${schoolCode} email=${principalEmail} password=${tempPassword}`);
  } catch (e: any) {
    await qr.rollbackTransaction();
    console.error('❌ Seed failed:', e?.message ?? e);
    throw e;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
