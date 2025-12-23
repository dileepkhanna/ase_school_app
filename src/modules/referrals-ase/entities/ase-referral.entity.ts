import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AseReferralStatus } from '../../../common/enums/referral-status.enum';

@Entity({ name: 'ase_referrals' })
@Index('idx_ase_referrals_school', ['referrerSchoolId'])
@Index('uq_ase_referrals_refer_id', ['referId'], { unique: true })
@Index('uq_ase_referrals_phone', ['phoneNumber'], { unique: true })
export class AseReferral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Referrer (current principal)
  @Column({ name: 'referrer_principal_user_id', type: 'uuid' })
  referrerPrincipalUserId!: string;

  @Column({ name: 'referrer_school_id', type: 'uuid' })
  referrerSchoolId!: string;

  @Column({ name: 'referrer_school_code', type: 'varchar', length: 30 })
  referrerSchoolCode!: string;

  @Column({ name: 'referrer_school_name', type: 'varchar', length: 160 })
  referrerSchoolName!: string;

  // Referred (new school)
  @Column({ name: 'referred_school_name', type: 'varchar', length: 160 })
  referredSchoolName!: string;

  @Column({ name: 'candidate_name', type: 'varchar', length: 160 })
  candidateName!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber!: string;

  // Unique 8-char alpha-numeric
  @Column({ name: 'refer_id', type: 'varchar', length: 16 })
  referId!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AseReferralStatus,
    default: AseReferralStatus.SUBMITTED,
  })
  status!: AseReferralStatus;

  @Column({ name: 'reward_amount', type: 'int', default: 5000 })
  rewardAmount!: number;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;



  @Column({ name: 'payout_status', type: 'boolean', default: false })
  payoutStatus!: boolean; // false = Not Paid, true = Paid

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
