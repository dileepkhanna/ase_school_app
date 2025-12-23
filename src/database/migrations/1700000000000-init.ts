import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
          CREATE TYPE role_enum AS ENUM ('PRINCIPAL','TEACHER','STUDENT','ASE_ADMIN');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
          CREATE TYPE gender_enum AS ENUM ('MALE','FEMALE','OTHER');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circular_type_enum') THEN
          CREATE TYPE circular_type_enum AS ENUM ('EXAM','EVENT','PTM','HOLIDAY','TRANSPORT','GENERAL');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_mark_enum') THEN
          CREATE TYPE attendance_mark_enum AS ENUM ('P','A','H');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_session_enum') THEN
          CREATE TYPE attendance_session_enum AS ENUM ('MORNING','AFTERNOON');
        END IF;
      END $$;
    `);

    // =========================
    // schools
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_code varchar(32) NOT NULL UNIQUE,
        name varchar(180) NOT NULL,
        logo_url text NULL,

        geofence_lat double precision NULL,
        geofence_lng double precision NULL,
        geofence_radius_m int NULL,

        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
    `);

    // =========================
    // users (auth identity)
    // NOTE: school_id can be NULL for ASE_ADMIN.
    // Login is always schoolCode + email + password (except admin panel can use only email).
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        school_id uuid NULL REFERENCES schools(id) ON DELETE SET NULL,
        school_code varchar(32) NULL, -- duplicated for convenience (validated in app)

        role role_enum NOT NULL,
        email varchar(255) NOT NULL,
        phone varchar(20) NULL,

        password_hash text NOT NULL,

        must_change_password boolean NOT NULL DEFAULT false,
        biometrics_enabled boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,

        last_login_at timestamptz NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Unique: one email per school (school_id not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_school_email
      ON users (school_id, email)
      WHERE school_id IS NOT NULL;
    `);

    // Unique: admin email (school_id null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_admin_email
      ON users (email)
      WHERE school_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);
    `);

    // =========================
    // sessions (single-device enforcement via device_id)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        device_id varchar(128) NOT NULL,
        refresh_token_hash text NOT NULL,

        is_active boolean NOT NULL DEFAULT true,
        revoked_at timestamptz NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON auth_sessions(user_id, is_active);
    `);

    // Only one active session per user for principal/teacher (enforced in service),
    // but DB index helps queries:
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_device ON auth_sessions(user_id, device_id);
    `);

    // =========================
    // OTP requests (store OTP HASH only)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_otps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        email varchar(255) NOT NULL,
        otp_hash text NOT NULL,
        otp_salt varchar(64) NOT NULL,

        attempts int NOT NULL DEFAULT 0,
        max_attempts int NOT NULL DEFAULT 5,

        expires_at timestamptz NOT NULL,
        cooldown_until timestamptz NULL,

        used_at timestamptz NULL,

        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_otps_user_email ON auth_otps(user_id, email);
    `);

    // =========================
    // class_sections
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS class_sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL, -- A/B/C/D etc (optional)

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (school_id, class_number, section)
      );
    `);

    // =========================
    // teacher_profiles (principal creates teachers)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

        teacher_id varchar(64) NOT NULL, -- school-specific
        full_name varchar(180) NOT NULL,
        gender gender_enum NOT NULL,
        dob date NULL,

        profile_photo_url text NULL,

        class_teacher_class int NULL,
        class_teacher_section varchar(8) NULL,

        subject_teacher text NULL, -- simple string list; later we can normalize

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (school_id, teacher_id)
      );
    `);

    // =========================
    // student_profiles
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

        full_name varchar(180) NOT NULL,
        gender gender_enum NOT NULL,
        roll_number int NOT NULL,
        dob date NULL,

        profile_photo_url text NULL,

        mobile_number varchar(20) NULL,

        class_number int NOT NULL,
        section varchar(8) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (school_id, class_number, section, roll_number)
      );
    `);

    // =========================
    // device tokens (push)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        device_id varchar(128) NOT NULL,
        fcm_token text NOT NULL,

        platform varchar(32) NULL, -- android/ios
        last_seen_at timestamptz NOT NULL DEFAULT now(),

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE(user_id, device_id)
      );
    `);

    // =========================
    // security alerts (geo restricted login)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        teacher_name varchar(180) NOT NULL,

        type varchar(64) NOT NULL, -- 'GEO_LOGIN_ATTEMPT'
        message text NOT NULL,

        distance_m int NULL,
        attempted_lat double precision NULL,
        attempted_lng double precision NULL,

        status varchar(16) NOT NULL DEFAULT 'NEW', -- NEW/SEEN
        created_at timestamptz NOT NULL DEFAULT now(),
        seen_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_alerts_school_status
      ON security_alerts (school_id, status, created_at DESC);
    `);

    // =========================
    // circulars
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS circulars (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        type circular_type_enum NOT NULL,
        title varchar(200) NOT NULL,
        description text NOT NULL,
        image_urls text[] NULL,

        publish_date timestamptz NOT NULL DEFAULT now(),
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_circulars_school_type_date
      ON circulars (school_id, type, publish_date DESC);
    `);

    // Read-state per user per circular (for unseen badge logic)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS circular_read_state (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circular_id uuid NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        seen_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (circular_id, user_id)
      );
    `);

    // =========================
    // notifications feed (general notifications)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(200) NOT NULL,
        body text NULL,
        image_url text NULL,

        data jsonb NULL,

        is_read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        read_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read
      ON notifications (user_id, is_read, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS notifications;`);
    await queryRunner.query(`DROP TABLE IF EXISTS circular_read_state;`);
    await queryRunner.query(`DROP TABLE IF EXISTS circulars;`);
    await queryRunner.query(`DROP TABLE IF EXISTS security_alerts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS device_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_profiles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teacher_profiles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS class_sections;`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_otps;`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_sessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS schools;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS attendance_session_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS attendance_mark_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS circular_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS gender_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS role_enum;`);
  }
}
