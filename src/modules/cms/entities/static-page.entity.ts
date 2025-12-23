import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'static_pages' })
@Index('uq_static_pages_key', ['key'], { unique: true })
export class StaticPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Fixed keys used by the apps:
   * PRIVACY_POLICY | TERMS | FAQ | ABOUT_ASE
   */
  @Column({ name: 'key', type: 'varchar', length: 40 })
  key!: string;

  @Column({ name: 'title', type: 'varchar', length: 140 })
  title!: string;

  /**
   * Store as markdown or HTML (frontend decides rendering)
   */
  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
