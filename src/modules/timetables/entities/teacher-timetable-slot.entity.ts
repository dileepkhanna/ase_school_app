import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeacherTimetable } from './teacher-timetable.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'teacher_timetable_slots' })
@Index('idx_teacher_timetable_slots_timetable_day_order', ['timetableId', 'dayOfWeek', 'sortOrder'])
export class TeacherTimetableSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'timetable_id', type: 'uuid' })
  timetableId!: string;

  @ManyToOne(() => TeacherTimetable, (t) => t.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetable_id' })
  timetable?: TeacherTimetable;

  /**
   * 1=Mon ... 7=Sun (simple and predictable)
   */
  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  /**
   * Store as plain text to support formats like "09:10 - 09:50"
   * (Later we can normalize to start_time/end_time if needed)
   */
  @Column({ name: 'timing', type: 'varchar', length: 40 })
  timing!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 120 })
  subject!: string;

  /**
   * Assigned teacher for this slot (dropdown assignment)
   * For a teacher-specific timetable, this will usually equal timetable.teacherUserId,
   * but we keep it to support future substitutions.
   */
  @Column({ name: 'assigned_teacher_user_id', type: 'uuid' })
  assignedTeacherUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigned_teacher_user_id' })
  assignedTeacherUser?: User;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
