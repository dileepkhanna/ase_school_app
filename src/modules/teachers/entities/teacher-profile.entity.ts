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

@Entity({ name: 'teacher_profiles' })
@Index('uq_teacher_profiles_user_id', ['userId'], { unique: true })
@Index('uq_teacher_profiles_school_teacher_id', ['schoolId', 'teacherId'], { unique: true })
export class TeacherProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'teacher_id', type: 'varchar', length: 64 })
  teacherId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 180 })
  fullName!: string;

  @Column({ name: 'gender', type: 'enum', enum: Gender, enumName: 'gender_enum' })
  gender!: Gender;

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob!: Date | null;

  @Column({ name: 'profile_photo_url', type: 'text', nullable: true })
  profilePhotoUrl!: string | null;

  @Column({ name: 'class_teacher_class', type: 'int', nullable: true })
  classTeacherClass!: number | null;

  @Column({ name: 'class_teacher_section', type: 'varchar', length: 8, nullable: true })
  classTeacherSection!: string | null;

  /**
   * Keep simple now (migration uses TEXT). Later we can normalize to a separate table.
   * Suggested format: JSON string array or comma-separated values (we’ll standardize in service).
   */
  @Column({ name: 'subject_teacher', type: 'text', nullable: true })
  subjectTeacher!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
