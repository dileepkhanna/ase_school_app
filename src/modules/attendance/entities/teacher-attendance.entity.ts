import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from '../../../common/enums/attendance.enum';

@Entity({ name: 'teacher_attendance' })
@Index('uq_teacher_attendance_unique_day', ['schoolId', 'teacherUserId', 'date'], { unique: true })
@Index('idx_teacher_attendance_school_date', ['schoolId', 'date'])
export class TeacherAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'teacher_user_id', type: 'uuid' })
  teacherUserId!: string;

  @Column({ name: 'date', type: 'date' })
  date!: Date;

  /**
   * P/A/H shown in calendar.
   * Later we can compute this automatically when teacher completes required work.
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: AttendanceStatus,
    enumName: 'attendance_status_enum',
  })
  status!: AttendanceStatus;

  @Column({ name: 'source', type: 'varchar', length: 32, default: 'SYSTEM' })
  source!: 'SYSTEM' | 'MANUAL';

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
