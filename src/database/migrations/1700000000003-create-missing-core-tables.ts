// import { MigrationInterface, QueryRunner } from 'typeorm';

// /**
//  * Creates missing tables for core modules (Attendance, Recap, Homework, Admissions,
//  * Student Referrals, Exams, CMS, Teacher Subjects) and fixes Circular read-state table.
//  *
//  * NOTE: This migration is written to be safe to run on a DB that already has the init migration.
//  * It uses IF NOT EXISTS and guards to reduce breaking changes.
//  */
// export class CreateMissingCoreTables1700000000003 implements MigrationInterface {
//   name = 'CreateMissingCoreTables1700000000003';

//   public async up(queryRunner: QueryRunner): Promise<void> {
//     // -------------------------------------------------------------------------
//     // Enums (create only if missing)
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
// DO $$
// BEGIN
//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
//     CREATE TYPE attendance_status_enum AS ENUM ('P','A','H');
//   END IF;

//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_status_enum') THEN
//     CREATE TYPE admission_status_enum AS ENUM ('NOT_JOINED','JOINED');
//   END IF;

//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
//     CREATE TYPE payment_status_enum AS ENUM ('PENDING','DONE');
//   END IF;
// END$$;
//     `);

//     // -------------------------------------------------------------------------
//     // Circular read-state FIX:
//     // Old: circular_read_state(user_id,circular_id,seen_at)
//     // New: circular_read_states(school_id,user_id,type,last_seen_at,updated_at)
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS circular_read_states (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         type circular_type_enum NOT NULL,
//         last_seen_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     await queryRunner.query(`
//       DO $$
//       BEGIN
//         IF NOT EXISTS (
//           SELECT 1 FROM pg_indexes
//           WHERE schemaname = 'public' AND indexname = 'uq_circular_read_states_school_user_type'
//         ) THEN
//           CREATE UNIQUE INDEX uq_circular_read_states_school_user_type
//           ON circular_read_states (school_id, user_id, type);
//         END IF;
//       END$$;
//     `);

//     // Migrate old table if it exists (best-effort)
//     await queryRunner.query(`
//       DO $$
//       BEGIN
//         IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circular_read_state') THEN
//           INSERT INTO circular_read_states (school_id, user_id, type, last_seen_at, updated_at)
//           SELECT
//             c.school_id,
//             crs.user_id,
//             c.type,
//             MAX(crs.seen_at) AS last_seen_at,
//             now() AS updated_at
//           FROM circular_read_state crs
//           JOIN circulars c ON c.id = crs.circular_id
//           GROUP BY c.school_id, crs.user_id, c.type
//           ON CONFLICT (school_id, user_id, type)
//           DO UPDATE SET
//             last_seen_at = EXCLUDED.last_seen_at,
//             updated_at = now();

//           DROP TABLE circular_read_state;
//         END IF;
//       END$$;
//     `);

//     // -------------------------------------------------------------------------
//     // Attendance tables
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS teacher_attendance (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         date date NOT NULL,
//         status attendance_status_enum NOT NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_teacher_attendance UNIQUE (school_id, teacher_user_id, date)
//       );
//     `);

//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS student_attendance (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
//         date date NOT NULL,
//         morning_status attendance_status_enum NOT NULL DEFAULT 'P',
//         afternoon_status attendance_status_enum NOT NULL DEFAULT 'P',
//         marked_by_teacher_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
//         notes text NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_student_attendance UNIQUE (school_id, student_profile_id, date)
//       );
//     `);

//     await queryRunner.query(`
//       DO $$
//       BEGIN
//         IF NOT EXISTS (
//           SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_attendance_school_date'
//         ) THEN
//           CREATE INDEX idx_student_attendance_school_date ON student_attendance (school_id, date);
//         END IF;
//       END$$;
//     `);

//     // -------------------------------------------------------------------------
//     // Recaps
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS recaps (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         teacher_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
//         created_by_principal_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
//         title text NULL,
//         description text NOT NULL,
//         attachments text[] NULL,
//         class_number int NULL,
//         section varchar(10) NULL,
//         subject text NULL,
//         recap_date date NULL,
//         timetable_entry_id uuid NULL REFERENCES timetable_entries(id) ON DELETE SET NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     // -------------------------------------------------------------------------
//     // Homework
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS homework (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         title text NULL,
//         description text NOT NULL,
//         attachments text[] NULL,
//         class_number int NOT NULL,
//         section varchar(10) NULL,
//         subject text NULL,
//         homework_date date NOT NULL,
//         timetable_entry_id uuid NULL REFERENCES timetable_entries(id) ON DELETE SET NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     // -------------------------------------------------------------------------
//     // Student Referrals (Teacher Refer & Earn for admissions)
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS student_referrals (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         student_name text NOT NULL,
//         gender gender_enum NOT NULL,
//         applying_class text NOT NULL,
//         phone_number varchar(20) NOT NULL,
//         new_admission_id uuid NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     // -------------------------------------------------------------------------
//     // New Admissions (Principal updates status/payment)
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS new_admissions (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         referral_id uuid NOT NULL REFERENCES student_referrals(id) ON DELETE CASCADE,
//         student_name text NOT NULL,
//         gender gender_enum NOT NULL,
//         applying_class text NOT NULL,
//         phone_number varchar(20) NOT NULL,
//         referring_teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         admission_status admission_status_enum NOT NULL DEFAULT 'NOT_JOINED',
//         payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
//         reward_status varchar(50) NOT NULL DEFAULT 'PENDING_REWARD',
//         submitted_at timestamptz NOT NULL DEFAULT now(),
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_new_admissions_referral UNIQUE (school_id, referral_id)
//       );
//     `);

//     // Add FK from student_referrals.new_admission_id -> new_admissions.id (if not already)
//     await queryRunner.query(`
//       DO $$
//       BEGIN
//         IF NOT EXISTS (
//           SELECT 1 FROM information_schema.table_constraints
//           WHERE table_name='student_referrals'
//             AND constraint_type='FOREIGN KEY'
//             AND constraint_name='fk_student_referrals_new_admission'
//         ) THEN
//           ALTER TABLE student_referrals
//             ADD CONSTRAINT fk_student_referrals_new_admission
//             FOREIGN KEY (new_admission_id)
//             REFERENCES new_admissions(id)
//             ON DELETE SET NULL;
//         END IF;
//       END$$;
//     `);

//     // -------------------------------------------------------------------------
//     // Exams
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS exams (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         name text NOT NULL,
//         academic_year text NOT NULL,
//         applicable_classes text[] NOT NULL,
//         start_date date NOT NULL,
//         end_date date NOT NULL,
//         created_by_principal_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS exam_schedules (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
//         class_number int NOT NULL,
//         section varchar(10) NULL,
//         subject text NOT NULL,
//         exam_date date NOT NULL,
//         timing text NOT NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS exam_marks (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         exam_schedule_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
//         student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
//         teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         marks_obtained numeric(6,2) NOT NULL DEFAULT 0,
//         maximum_marks numeric(6,2) NOT NULL DEFAULT 100,
//         status varchar(30) NOT NULL DEFAULT 'DRAFT',
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_exam_marks UNIQUE (school_id, exam_schedule_id, student_profile_id)
//       );
//     `);

//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS exam_results (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
//         class_number int NOT NULL,
//         section varchar(10) NULL,
//         student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
//         total_obtained numeric(8,2) NOT NULL DEFAULT 0,
//         total_maximum numeric(8,2) NOT NULL DEFAULT 0,
//         percentage numeric(6,2) NOT NULL DEFAULT 0,
//         grade varchar(10) NOT NULL DEFAULT 'F',
//         result_status varchar(20) NOT NULL DEFAULT 'FAIL',
//         published boolean NOT NULL DEFAULT false,
//         published_at timestamptz NULL,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_exam_results UNIQUE (school_id, exam_id, student_profile_id)
//       );
//     `);

//     // -------------------------------------------------------------------------
//     // CMS
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS static_pages (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         slug varchar(80) NOT NULL UNIQUE,
//         title text NOT NULL,
//         content text NOT NULL,
//         is_active boolean NOT NULL DEFAULT true,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);

//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS school_pages (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         slug varchar(80) NOT NULL,
//         title text NOT NULL,
//         content text NOT NULL,
//         is_active boolean NOT NULL DEFAULT true,
//         created_at timestamptz NOT NULL DEFAULT now(),
//         updated_at timestamptz NOT NULL DEFAULT now(),
//         CONSTRAINT uq_school_pages UNIQUE (school_id, slug)
//       );
//     `);

//     // -------------------------------------------------------------------------
//     // Teacher Subjects (optional but helps normalization)
//     // -------------------------------------------------------------------------
//     await queryRunner.query(`
//       CREATE TABLE IF NOT EXISTS teacher_subjects (
//         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//         school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
//         teacher_profile_id uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
//         subject text NOT NULL,
//         created_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);
//   }

//   public async down(queryRunner: QueryRunner): Promise<void> {
//     // Reverse order (best-effort)
//     await queryRunner.query(`DROP TABLE IF EXISTS teacher_subjects;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS school_pages;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS static_pages;`);

//     await queryRunner.query(`DROP TABLE IF EXISTS exam_results;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS exam_marks;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS exam_schedules;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS exams;`);

//     await queryRunner.query(`ALTER TABLE IF EXISTS student_referrals DROP CONSTRAINT IF EXISTS fk_student_referrals_new_admission;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS new_admissions;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS student_referrals;`);

//     await queryRunner.query(`DROP TABLE IF EXISTS homework;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS recaps;`);

//     await queryRunner.query(`DROP TABLE IF EXISTS student_attendance;`);
//     await queryRunner.query(`DROP TABLE IF EXISTS teacher_attendance;`);

//     await queryRunner.query(`DROP TABLE IF EXISTS circular_read_states;`);

//     // Enums (drop only if you want; but safe to keep)
//     // await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum;`);
//     // await queryRunner.query(`DROP TYPE IF EXISTS admission_status_enum;`);
//     // await queryRunner.query(`DROP TYPE IF EXISTS attendance_status_enum;`);
//   }
// }















import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissingCoreTables1700000000003 implements MigrationInterface {
  name = 'CreateMissingCoreTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Needed for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Create enums if missing (init migration does NOT create these)
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    CREATE TYPE attendance_status_enum AS ENUM ('P','A','H');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_status_enum') THEN
    CREATE TYPE admission_status_enum AS ENUM ('NOT_JOINED','JOINED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM ('PENDING','DONE');
  END IF;
END$$;
    `);

    // =========================
    // circular_read_states (new)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS circular_read_states (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type circular_type_enum NOT NULL,
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_circular_read_states_school_user_type'
        ) THEN
          CREATE UNIQUE INDEX uq_circular_read_states_school_user_type
          ON circular_read_states (school_id, user_id, type);
        END IF;
      END$$;
    `);

    // migrate legacy circular_read_state -> circular_read_states if present
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'circular_read_state') THEN
          INSERT INTO circular_read_states (school_id, user_id, type, last_seen_at, updated_at)
          SELECT
            c.school_id,
            crs.user_id,
            c.type,
            MAX(crs.seen_at) AS last_seen_at,
            now() AS updated_at
          FROM circular_read_state crs
          JOIN circulars c ON c.id = crs.circular_id
          GROUP BY c.school_id, crs.user_id, c.type
          ON CONFLICT (school_id, user_id, type)
          DO UPDATE SET
            last_seen_at = EXCLUDED.last_seen_at,
            updated_at = now();

          DROP TABLE circular_read_state;
        END IF;
      END$$;
    `);

    // =========================
    // teacher_attendance (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_attendance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        status attendance_status_enum NOT NULL,
        source varchar(32) NOT NULL DEFAULT 'SYSTEM',
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_teacher_attendance_unique_day UNIQUE (school_id, teacher_user_id, date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teacher_attendance_school_date
      ON teacher_attendance (school_id, date);
    `);

    // =========================
    // student_attendance (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_attendance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
        class_number int NOT NULL,
        section varchar(8) NULL,
        date date NOT NULL,

        morning_status attendance_status_enum NULL,
        afternoon_status attendance_status_enum NULL,
        final_status attendance_status_enum NULL,

        marked_by_teacher_user_id_morning uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        marked_by_teacher_user_id_afternoon uuid NULL REFERENCES users(id) ON DELETE SET NULL,

        submitted_at_morning timestamptz NULL,
        submitted_at_afternoon timestamptz NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_student_attendance_unique_day UNIQUE (school_id, student_profile_id, date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_attendance_school_class_date
      ON student_attendance (school_id, class_number, section, date);
    `);

    // =========================
    // recaps (matches entity - NO timetable_entries FK)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recaps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        created_by_principal_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,

        class_number int NULL,
        section varchar(8) NULL,
        subject varchar(120) NULL,

        date date NOT NULL,
        content text NOT NULL,
        attachments text[] NULL,

        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recaps_school_date
      ON recaps (school_id, date);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recaps_school_teacher_date
      ON recaps (school_id, teacher_user_id, date);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recaps_school_class_date
      ON recaps (school_id, class_number, section, date);
    `);

    // =========================
    // homework (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS homework (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL,
        subject varchar(120) NULL,

        date date NOT NULL,
        content text NOT NULL,
        attachments text[] NULL,

        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_homework_school_date
      ON homework (school_id, date);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_homework_school_teacher_date
      ON homework (school_id, teacher_user_id, date);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_homework_school_class_date
      ON homework (school_id, class_number, section, date);
    `);

    // =========================
    // student_referrals (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_referrals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        student_name varchar(120) NOT NULL,
        gender varchar(10) NOT NULL,
        applying_class int NOT NULL,
        phone_number varchar(10) NOT NULL,

        new_admission_id uuid NULL,

        admission_status admission_status_enum NOT NULL DEFAULT 'NOT_JOINED',
        payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
        reward_status varchar(16) NOT NULL DEFAULT 'PENDING',

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_referrals_school_teacher
      ON student_referrals (school_id, teacher_user_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_referrals_school_status
      ON student_referrals (school_id, admission_status, payment_status, reward_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_referrals_school_phone
      ON student_referrals (school_id, phone_number);
    `);

    // =========================
    // new_admissions (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS new_admissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        referral_id uuid NOT NULL,
        referring_teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        student_name varchar(120) NOT NULL,
        gender varchar(10) NOT NULL,
        applying_class int NOT NULL,
        phone_number varchar(10) NOT NULL,

        admission_status admission_status_enum NOT NULL DEFAULT 'NOT_JOINED',
        payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
        reward_status varchar(16) NOT NULL DEFAULT 'PENDING',

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_new_admissions_referral UNIQUE (referral_id)
      );
    `);

    // link student_referrals.new_admission_id -> new_admissions.id (now that table exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_student_referrals_new_admission'
            AND table_name = 'student_referrals'
        ) THEN
          ALTER TABLE student_referrals
          ADD CONSTRAINT fk_student_referrals_new_admission
          FOREIGN KEY (new_admission_id) REFERENCES new_admissions(id)
          ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_new_admissions_school_status
      ON new_admissions (school_id, admission_status, payment_status, reward_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_new_admissions_school_teacher
      ON new_admissions (school_id, referring_teacher_user_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_new_admissions_school_phone
      ON new_admissions (school_id, phone_number);
    `);

    // =========================
    // exams (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        exam_name varchar(120) NOT NULL,
        academic_year varchar(20) NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,

        applicable_class_sections jsonb NOT NULL DEFAULT '[]'::jsonb,

        created_by_principal_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exams_school_year
      ON exams (school_id, academic_year);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exams_school_dates
      ON exams (school_id, start_date, end_date);
    `);

    // =========================
    // exam_schedules (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL,

        subject varchar(120) NOT NULL,
        exam_date date NOT NULL,
        timing varchar(80) NOT NULL,

        created_by_principal_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_exam_schedules_unique_subject UNIQUE (school_id, exam_id, class_number, section, subject)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_exam
      ON exam_schedules (school_id, exam_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_date
      ON exam_schedules (school_id, exam_date);
    `);

    // =========================
    // exam_marks (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_marks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        schedule_id uuid NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,

        student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL,
        subject varchar(120) NOT NULL,

        entered_by_teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        marks_obtained numeric(6,2) NOT NULL,
        max_marks numeric(6,2) NOT NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_exam_marks_unique_student_subject UNIQUE (school_id, exam_id, schedule_id, student_profile_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_marks_school_exam
      ON exam_marks (school_id, exam_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_marks_school_student
      ON exam_marks (school_id, student_profile_id);
    `);

    // =========================
    // exam_results (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL,

        total_obtained numeric(8,2) NOT NULL DEFAULT 0,
        total_max numeric(8,2) NOT NULL DEFAULT 0,
        percentage numeric(6,2) NOT NULL DEFAULT 0,

        grade varchar(8) NULL,
        result_status varchar(8) NOT NULL DEFAULT 'PASS',

        is_published boolean NOT NULL DEFAULT false,
        published_by_teacher_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        published_at timestamptz NULL,

        subject_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_exam_results_unique_student UNIQUE (school_id, exam_id, student_profile_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_results_school_exam
      ON exam_results (school_id, exam_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_results_school_class
      ON exam_results (school_id, class_number, section);
    `);

    // =========================
    // static_pages (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS static_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(40) NOT NULL,
        title varchar(140) NOT NULL,
        content text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uq_static_pages_key'
        ) THEN
          CREATE UNIQUE INDEX uq_static_pages_key ON static_pages (key);
        END IF;
      END$$;
    `);

    // =========================
    // school_pages (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS school_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        key varchar(40) NOT NULL,
        title varchar(140) NOT NULL,
        content text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        updated_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uq_school_pages_key'
        ) THEN
          CREATE UNIQUE INDEX uq_school_pages_key ON school_pages (school_id, key);
        END IF;
      END$$;
    `);

    // =========================
    // teacher_subjects (matches entity)
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_profile_id uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uq_teacher_subjects_teacher_name'
        ) THEN
          CREATE UNIQUE INDEX uq_teacher_subjects_teacher_name
          ON teacher_subjects (teacher_profile_id, name);
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS teacher_subjects CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS school_pages CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS static_pages CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS exam_results CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS exam_marks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS exam_schedules CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS exams CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS new_admissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_referrals CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS homework CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recaps CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_attendance CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teacher_attendance CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS circular_read_states CASCADE;`);

    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    DROP TYPE attendance_status_enum;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_status_enum') THEN
    DROP TYPE admission_status_enum;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    DROP TYPE payment_status_enum;
  END IF;
END$$;
    `);
  }
}
