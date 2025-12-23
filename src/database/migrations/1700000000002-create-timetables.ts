import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimetables1700000000002 implements MigrationInterface {
  name = 'CreateTimetables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // =========================
    // teacher_timetables
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_timetables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        created_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,

        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (school_id, teacher_user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teacher_timetables_school_teacher
      ON teacher_timetables (school_id, teacher_user_id);
    `);

    // =========================
    // teacher_timetable_slots
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_timetable_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        timetable_id uuid NOT NULL REFERENCES teacher_timetables(id) ON DELETE CASCADE,

        day_of_week int NOT NULL,
        timing varchar(64) NOT NULL,

        class_number int NOT NULL,
        section varchar(8) NULL,

        subject varchar(180) NOT NULL,

        assigned_teacher_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teacher_timetable_slots_tt_day
      ON teacher_timetable_slots (timetable_id, day_of_week, sort_order);
    `);

    // =========================
    // student_timetables
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_timetables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        class_number int NOT NULL,
        section varchar(8) NULL,

        created_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,

        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        UNIQUE (school_id, class_number, section)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_timetables_school_class
      ON student_timetables (school_id, class_number, section);
    `);

    // =========================
    // student_timetable_slots
    // =========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_timetable_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        timetable_id uuid NOT NULL REFERENCES student_timetables(id) ON DELETE CASCADE,

        day_of_week int NOT NULL,
        timing varchar(64) NOT NULL,
        subject varchar(180) NOT NULL,

        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_student_timetable_slots_tt_day
      ON student_timetable_slots (timetable_id, day_of_week, sort_order);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS student_timetable_slots;`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_timetables;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teacher_timetable_slots;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teacher_timetables;`);
  }
}
