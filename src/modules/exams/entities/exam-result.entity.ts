import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'exam_results' })
@Index('idx_exam_results_school_exam', ['schoolId', 'examId'])
@Index('uq_exam_results_unique_student', ['schoolId', 'examId', 'studentProfileId'], { unique: true })
@Index('idx_exam_results_school_class', ['schoolId', 'classNumber', 'section'])
export class ExamResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @Column({ name: 'student_profile_id', type: 'uuid' })
  studentProfileId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  /**
   * Aggregated totals across subjects.
   */
  @Column({ name: 'total_obtained', type: 'numeric', precision: 8, scale: 2, default: 0 })
  totalObtained!: string;

  @Column({ name: 'total_max', type: 'numeric', precision: 8, scale: 2, default: 0 })
  totalMax!: string;

  @Column({ name: 'percentage', type: 'numeric', precision: 6, scale: 2, default: 0 })
  percentage!: string;

  @Column({ name: 'grade', type: 'varchar', length: 8, nullable: true })
  grade!: string | null;

  @Column({ name: 'result_status', type: 'varchar', length: 8, default: 'PASS' })
  resultStatus!: 'PASS' | 'FAIL';

  /**
   * Draft vs Published:
   * Students/Parents can view only when isPublished=true
   */
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ name: 'published_by_teacher_user_id', type: 'uuid', nullable: true })
  publishedByTeacherUserId!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  /**
   * Optional: store subject-wise breakdown snapshot for fast rendering in apps.
   * Example:
   * [{subject:"Math", obtained:45, max:50, scheduleId:"..."}]
   */
  @Column({ name: 'subject_breakdown', type: 'jsonb', default: () => `'[]'` })
  subjectBreakdown!: Array<{ subject: string; obtained: number; max: number; scheduleId: string }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
