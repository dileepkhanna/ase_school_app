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

export type StudentReferralRewardStatus = 'PENDING' | 'REWARDED';

@Entity({ name: 'student_referrals' })
@Index('idx_student_referrals_school_teacher', ['schoolId', 'teacherUserId', 'createdAt'])
@Index('idx_student_referrals_school_status', ['schoolId', 'admissionStatus', 'paymentStatus', 'rewardStatus'])
@Index('idx_student_referrals_school_phone', ['schoolId', 'phoneNumber'])
export class StudentReferral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'teacher_user_id', type: 'uuid' })
  teacherUserId!: string;

  /**
   * Core referral data (Teacher fills)
   */
  @Column({ name: 'student_name', type: 'varchar', length: 120 })
  studentName!: string;

  /**
   * Allow "OTHER" for this referral flow
   */
  @Column({ name: 'gender', type: 'varchar', length: 10 })
  gender!: 'MALE' | 'FEMALE' | 'OTHER';

  @Column({ name: 'applying_class', type: 'int' })
  applyingClass!: number;

  @Column({ name: 'phone_number', type: 'varchar', length: 10 })
  phoneNumber!: string;

  /**
   * Link to New Admission (created automatically after referral)
   * Will be created in 8.17 module and filled by service.
   */
  @Column({ name: 'new_admission_id', type: 'uuid', nullable: true })
  newAdmissionId!: string | null;

  /**
   * Status mirrors (updated by Principal from New Admission module).
   * Default values follow your requirement.
   */
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

  @Column({
    name: 'reward_status',
    type: 'varchar',
    length: 16,
    default: 'PENDING',
  })
  rewardStatus!: StudentReferralRewardStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
