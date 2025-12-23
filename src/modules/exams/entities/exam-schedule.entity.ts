import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'exam_schedules' })
@Index('idx_exam_schedules_school_exam', ['schoolId', 'examId'])
@Index('uq_exam_schedules_unique_subject', ['schoolId', 'examId', 'classNumber', 'section', 'subject'], { unique: true })
@Index('idx_exam_schedules_school_date', ['schoolId', 'examDate'])
export class ExamSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 120 })
  subject!: string;

  @Column({ name: 'exam_date', type: 'date' })
  examDate!: Date;

  /**
   * Store time as string for flexibility: "09:30 AM - 12:30 PM"
   * (We can normalize to start/end time later if needed)
   */
  @Column({ name: 'timing', type: 'varchar', length: 80 })
  timing!: string;

  @Column({ name: 'created_by_principal_user_id', type: 'uuid' })
  createdByPrincipalUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
