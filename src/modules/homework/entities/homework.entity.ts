import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'homework' })
@Index('idx_homework_school_date', ['schoolId', 'date'])
@Index('idx_homework_school_teacher_date', ['schoolId', 'teacherUserId', 'date'])
@Index('idx_homework_school_class_date', ['schoolId', 'classNumber', 'section', 'date'])
export class Homework {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'teacher_user_id', type: 'uuid' })
  teacherUserId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 120, nullable: true })
  subject!: string | null;

  /**
   * Calendar date of homework assignment
   */
  @Column({ name: 'date', type: 'date' })
  date!: Date;

  /**
   * Homework content/description
   */
  @Column({ name: 'content', type: 'text' })
  content!: string;

  /**
   * Attachments (Cloudflare R2 URLs)
   */
  @Column({ name: 'attachments', type: 'text', array: true, nullable: true })
  attachments!: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
