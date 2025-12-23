import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'exam_marks' })
@Index('idx_exam_marks_school_exam', ['schoolId', 'examId'])
@Index('uq_exam_marks_unique_student_subject', ['schoolId', 'examId', 'scheduleId', 'studentProfileId'], { unique: true })
@Index('idx_exam_marks_school_student', ['schoolId', 'studentProfileId'])
export class ExamMarks {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId!: string;

  @Column({ name: 'student_profile_id', type: 'uuid' })
  studentProfileId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 120 })
  subject!: string;

  /**
   * Teacher who entered marks (subject teacher / class teacher as per your rule)
   */
  @Column({ name: 'entered_by_teacher_user_id', type: 'uuid' })
  enteredByTeacherUserId!: string;

  @Column({ name: 'marks_obtained', type: 'numeric', precision: 6, scale: 2 })
  marksObtained!: string; // keep as string to preserve numeric precision

  @Column({ name: 'max_marks', type: 'numeric', precision: 6, scale: 2 })
  maxMarks!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
