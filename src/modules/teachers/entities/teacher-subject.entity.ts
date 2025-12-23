import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeacherProfile } from './teacher-profile.entity';

@Entity({ name: 'teacher_subjects' })
@Index('uq_teacher_subjects_teacher_name', ['teacherProfileId', 'name'], { unique: true })
export class TeacherSubject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'teacher_profile_id', type: 'uuid' })
  teacherProfileId!: string;

  @ManyToOne(() => TeacherProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_profile_id' })
  teacherProfile?: TeacherProfile;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
