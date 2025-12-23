import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAseReferralAdminNotes1700000000001 implements MigrationInterface {
  name = 'AddAseReferralAdminNotes1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgcrypto is available for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Create enum type (safe)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ase_referral_status_enum') THEN
          CREATE TYPE ase_referral_status_enum AS ENUM (
            'SUBMITTED',
            'VERIFIED',
            'IN_DEVELOPMENT',
            'DELIVERED',
            'PAYMENT_RECEIVED',
            'REWARD_PAID'
          );
        END IF;
      END $$;
    `);

    // Create table if missing (THIS fixes your error)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ase_referrals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        referrer_principal_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referrer_school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

        referrer_school_code varchar(32) NOT NULL,
        referrer_school_name varchar(180) NOT NULL,

        referred_school_name varchar(180) NOT NULL,
        candidate_name varchar(180) NOT NULL,
        phone_number varchar(20) NOT NULL,

        refer_id varchar(16) NOT NULL,

        status ase_referral_status_enum NOT NULL DEFAULT 'SUBMITTED',
        reward_amount int NOT NULL DEFAULT 5000,

        -- false = Not Paid, true = Paid
        payout_status boolean NOT NULL DEFAULT false,

        -- This is what your migration wanted to add:
        admin_notes text NULL,

        is_active boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Indexes / constraints
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ase_referrals_refer_id
      ON ase_referrals (refer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ase_referrals_referrer
      ON ase_referrals (referrer_school_id, referrer_principal_user_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ase_referrals_status
      ON ase_referrals (status, created_at DESC);
    `);

    // Optional fraud-safe best-effort uniqueness (active only)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ase_referrals_active_phone
      ON ase_referrals (referrer_school_id, phone_number)
      WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ase_referrals_active_schoolname
      ON ase_referrals (referrer_school_id, referred_school_name)
      WHERE is_active = true;
    `);

    // Create audit table if missing
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ase_referral_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ase_referral_id uuid NOT NULL REFERENCES ase_referrals(id) ON DELETE CASCADE,

        changed_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,

        old_status ase_referral_status_enum NULL,
        new_status ase_referral_status_enum NOT NULL,

        note text NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ase_referral_audits_referral_date
      ON ase_referral_audits (ase_referral_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down should be safe and reversible
    await queryRunner.query(`DROP TABLE IF EXISTS ase_referral_audits;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ase_referrals;`);

    // Keep enum type drop safe
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ase_referral_status_enum') THEN
          DROP TYPE ase_referral_status_enum;
        END IF;
      END $$;
    `);
  }
}
