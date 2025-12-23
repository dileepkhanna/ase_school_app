import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudentTimetable } from './student-timetable.entity';

@Entity({ name: 'student_timetable_slots' })
@Index('idx_student_timetable_slots_timetable_day_order', ['timetableId', 'dayOfWeek', 'sortOrder'])
export class StudentTimetableSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'timetable_id', type: 'uuid' })
  timetableId!: string;

  @ManyToOne(() => StudentTimetable, (t) => t.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetable_id' })
  timetable?: StudentTimetable;

  /**
   * 1=Mon ... 7=Sun
   */
  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  @Column({ name: 'timing', type: 'varchar', length: 40 })
  timing!: string;

  @Column({ name: 'subject', type: 'varchar', length: 120 })
  subject!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
