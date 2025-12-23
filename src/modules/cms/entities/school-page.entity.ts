import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'school_pages' })
@Index('uq_school_pages_key', ['schoolId', 'key'], { unique: true })
export class SchoolPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  /**
   * Usually: ABOUT_SCHOOL (you can extend later)
   */
  @Column({ name: 'key', type: 'varchar', length: 40 })
  key!: string;

  @Column({ name: 'title', type: 'varchar', length: 140 })
  title!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
