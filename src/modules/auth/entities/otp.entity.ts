import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'auth_otps' })
@Index('idx_otps_user_email', ['userId', 'email'])
export class AuthOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  /**
   * Store HASH only (never raw OTP)
   */
  @Column({ name: 'otp_hash', type: 'text' })
  otpHash!: string;

  @Column({ name: 'otp_salt', type: 'varchar', length: 64 })
  otpSalt!: string;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'cooldown_until', type: 'timestamptz', nullable: true })
  cooldownUntil!: Date | null;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
