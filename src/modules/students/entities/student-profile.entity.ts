import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender } from '../../../common/enums/gender.enum';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'student_profiles' })
@Index('uq_student_profiles_user_id', ['userId'], { unique: true })
@Index('uq_student_profiles_school_class_section_roll', ['schoolId', 'classNumber', 'section', 'rollNumber'], {
  unique: true,
})
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'full_name', type: 'varchar', length: 180 })
  fullName!: string;

  @Column({ name: 'gender', type: 'enum', enum: Gender, enumName: 'gender_enum' })
  gender!: Gender;

  @Column({ name: 'roll_number', type: 'int' })
  rollNumber!: number;

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob!: Date | null;

  @Column({ name: 'profile_photo_url', type: 'text', nullable: true })
  profilePhotoUrl!: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber!: string | null;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
