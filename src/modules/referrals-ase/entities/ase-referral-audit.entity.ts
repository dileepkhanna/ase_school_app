import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AseReferralStatus } from '../../../common/enums/referral-status.enum';

@Entity({ name: 'ase_referral_audits' })
@Index('idx_ase_referral_audits_referral', ['aseReferralId'])
@Index('idx_ase_referral_audits_school', ['schoolId'])
export class AseReferralAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ase_referral_id', type: 'uuid' })
  aseReferralId!: string;

  /**
   * Referrer school scope (so admin can filter quickly)
   */
  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId!: string;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: AseReferralStatus,
    nullable: true,
  })
  oldStatus!: AseReferralStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: AseReferralStatus,
  })
  newStatus!: AseReferralStatus;

  @Column({ name: 'note', type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
