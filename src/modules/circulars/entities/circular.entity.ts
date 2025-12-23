// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn,
// } from 'typeorm';
// import { CircularType } from '../../../common/enums/circular-type.enum';

// @Entity({ name: 'circulars' })
// @Index('idx_circulars_school_type_date', ['schoolId', 'type', 'publishDate'])
// export class Circular {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ name: 'school_id', type: 'uuid' })
//   schoolId!: string;

//   @Column({ name: 'type', type: 'enum', enum: CircularType, enumName: 'circular_type_enum' })
//   type!: CircularType;

//   @Column({ name: 'title', type: 'varchar', length: 200 })
//   title!: string;

//   @Column({ name: 'description', type: 'text' })
//   description!: string;

//   /**
//    * Cloudflare R2 URLs
//    */
//   @Column({ name: 'images', type: 'text', array: true, nullable: true })
//   images!: string[] | null;

//   @Column({ name: 'publish_date', type: 'timestamptz', default: () => 'now()' })
//   publishDate!: Date;

//   @Column({ name: 'created_by', type: 'uuid' })
//   createdBy!: string; // Principal userId

//   @Column({ name: 'is_active', type: 'boolean', default: true })
//   isActive!: boolean;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;
// }








import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CircularType } from '../../../common/enums/circular-type.enum';

@Entity({ name: 'circulars' })
@Index('idx_circulars_school_type_date', ['schoolId', 'type', 'publishDate'])
export class Circular {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'type', type: 'enum', enum: CircularType, enumName: 'circular_type_enum' })
  type!: CircularType;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  /**
   * ✅ FIX: DB column is `image_urls` (text[])
   * Keep property name `images` to avoid refactor everywhere.
   */
  @Column({ name: 'image_urls', type: 'text', array: true, nullable: true })
  images!: string[] | null;

  @Column({ name: 'publish_date', type: 'timestamptz', default: () => 'now()' })
  publishDate!: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string; // Principal userId

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
