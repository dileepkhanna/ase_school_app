import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

@Entity({ name: 'users' })
@Index('idx_users_school_role', ['schoolId', 'role'])
@Index('uq_users_school_email', ['schoolId', 'email'], {
  unique: true,
  where: `"school_id" IS NOT NULL`,
})
@Index('uq_users_admin_email', ['email'], {
  unique: true,
  where: `"school_id" IS NULL`,
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId!: string | null;

  @Column({ name: 'school_code', type: 'varchar', length: 32, nullable: true })
  schoolCode!: string | null;

  @Column({ name: 'role', type: 'enum', enum: Role, enumName: 'role_enum' })
  role!: Role;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'biometrics_enabled', type: 'boolean', default: false })
  biometricsEnabled!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.email) this.email = this.email.trim().toLowerCase();
    if (this.schoolCode) this.schoolCode = this.schoolCode.trim().toUpperCase();
    if (this.phone) this.phone = this.phone.trim();
  }
}
