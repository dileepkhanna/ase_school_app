import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TeacherTimetableSlot } from './teacher-timetable-slot.entity';

@Entity({ name: 'teacher_timetables' })
@Index('uq_teacher_timetable_school_teacher', ['schoolId', 'teacherUserId'], { unique: true })
export class TeacherTimetable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  // Owner teacher (who will see in "My Time Table")
  @Column({ name: 'teacher_user_id', type: 'uuid' })
  teacherUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_user_id' })
  teacherUser?: User;

  // Created/updated by Principal userId
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => TeacherTimetableSlot, (s) => s.timetable, {
    cascade: true,
  })
  slots?: TeacherTimetableSlot[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
