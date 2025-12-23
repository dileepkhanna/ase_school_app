import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from '../../../common/enums/attendance.enum';

export type AttendanceSession = 'MORNING' | 'AFTERNOON';

@Entity({ name: 'student_attendance' })
@Index('uq_student_attendance_unique_day', ['schoolId', 'studentProfileId', 'date'], { unique: true })
@Index('idx_student_attendance_school_class_date', ['schoolId', 'classNumber', 'section', 'date'])
export class StudentAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'student_profile_id', type: 'uuid' })
  studentProfileId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'date', type: 'date' })
  date!: Date;

  /**
   * Marked by teacher:
   * MORNING and AFTERNOON are stored separately.
   * finalStatus is derived/stored for easy calendar queries.
   */
  @Column({
    name: 'morning_status',
    type: 'enum',
    enum: AttendanceStatus,
    enumName: 'attendance_status_enum',
    nullable: true,
  })
  morningStatus!: AttendanceStatus | null; // P or A

  @Column({
    name: 'afternoon_status',
    type: 'enum',
    enum: AttendanceStatus,
    enumName: 'attendance_status_enum',
    nullable: true,
  })
  afternoonStatus!: AttendanceStatus | null; // P or A

  @Column({
    name: 'final_status',
    type: 'enum',
    enum: AttendanceStatus,
    enumName: 'attendance_status_enum',
    nullable: true,
  })
  finalStatus!: AttendanceStatus | null; // P / A / H (computed)

  @Column({ name: 'marked_by_teacher_user_id_morning', type: 'uuid', nullable: true })
  markedByTeacherUserIdMorning!: string | null;

  @Column({ name: 'marked_by_teacher_user_id_afternoon', type: 'uuid', nullable: true })
  markedByTeacherUserIdAfternoon!: string | null;

  @Column({ name: 'submitted_at_morning', type: 'timestamptz', nullable: true })
  submittedAtMorning!: Date | null;

  @Column({ name: 'submitted_at_afternoon', type: 'timestamptz', nullable: true })
  submittedAtAfternoon!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
