import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'recaps' })
@Index('idx_recaps_school_date', ['schoolId', 'date'])
@Index('idx_recaps_school_teacher_date', ['schoolId', 'teacherUserId', 'date'])
@Index('idx_recaps_school_class_date', ['schoolId', 'classNumber', 'section', 'date'])
export class Recap {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  /**
   * Recap owner (teacher who submitted OR principal self recap)
   */
  @Column({ name: 'teacher_user_id', type: 'uuid', nullable: true })
  teacherUserId!: string | null;

  /**
   * If principal creates self recap: createdByPrincipalUserId is set.
   * If teacher creates: createdByPrincipalUserId is null.
   */
  @Column({ name: 'created_by_principal_user_id', type: 'uuid', nullable: true })
  createdByPrincipalUserId!: string | null;

  /**
   * If teacher recap is tied to timetable class session:
   */
  @Column({ name: 'class_number', type: 'int', nullable: true })
  classNumber!: number | null;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 120, nullable: true })
  subject!: string | null;

  /**
   * Calendar date of recap (not time)
   */
  @Column({ name: 'date', type: 'date' })
  date!: Date;

  /**
   * Main recap text
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
