import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'exams' })
@Index('idx_exams_school_year', ['schoolId', 'academicYear'])
@Index('idx_exams_school_dates', ['schoolId', 'startDate', 'endDate'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'exam_name', type: 'varchar', length: 120 })
  examName!: string;

  /**
   * Example: "2025-2026"
   */
  @Column({ name: 'academic_year', type: 'varchar', length: 20 })
  academicYear!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  /**
   * Applicable class-sections snapshot at creation time.
   * This allows you to later show which classes are included.
   * Example:
   * [{"classNumber":8,"section":"B"},{"classNumber":9,"section":null}]
   */
  @Column({ name: 'applicable_class_sections', type: 'jsonb', default: () => `'[]'` })
  applicableClassSections!: Array<{ classNumber: number; section: string | null }>;

  @Column({ name: 'created_by_principal_user_id', type: 'uuid' })
  createdByPrincipalUserId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
