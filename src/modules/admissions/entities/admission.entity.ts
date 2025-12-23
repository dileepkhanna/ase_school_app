import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionStatus } from '../../../common/enums/admission-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export type AdmissionRewardStatus = 'PENDING' | 'REWARDED';

@Entity({ name: 'new_admissions' })
@Index('uq_new_admissions_referral', ['schoolId', 'referralId'], { unique: true })
@Index('idx_new_admissions_school_status', ['schoolId', 'admissionStatus', 'paymentStatus', 'rewardStatus'])
@Index('idx_new_admissions_school_teacher', ['schoolId', 'referringTeacherUserId', 'createdAt'])
@Index('idx_new_admissions_school_phone', ['schoolId', 'phoneNumber'])
export class Admission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  /**
   * Dependency rule: Admission MUST be created from Teacher referral only.
   * This referralId is the hard guarantee.
   */
  @Column({ name: 'referral_id', type: 'uuid' })
  referralId!: string;

  @Column({ name: 'referring_teacher_user_id', type: 'uuid' })
  referringTeacherUserId!: string;

  @Column({ name: 'student_name', type: 'varchar', length: 120 })
  studentName!: string;

  @Column({ name: 'gender', type: 'varchar', length: 10 })
  gender!: 'MALE' | 'FEMALE' | 'OTHER';

  @Column({ name: 'applying_class', type: 'int' })
  applyingClass!: number;

  @Column({ name: 'phone_number', type: 'varchar', length: 10 })
  phoneNumber!: string;

  @Column({
    name: 'admission_status',
    type: 'enum',
    enum: AdmissionStatus,
    enumName: 'admission_status_enum',
    default: AdmissionStatus.NOT_JOINED,
  })
  admissionStatus!: AdmissionStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'reward_status', type: 'varchar', length: 16, default: 'PENDING' })
  rewardStatus!: AdmissionRewardStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
