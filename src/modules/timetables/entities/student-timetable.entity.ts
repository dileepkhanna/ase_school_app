import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentTimetableSlot } from './student-timetable-slot.entity';

@Entity({ name: 'student_timetables' })
@Index('uq_student_timetable_school_class_section', ['schoolId', 'classNumber', 'section'], { unique: true })
export class StudentTimetable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'class_number', type: 'int' })
  classNumber!: number;

  @Column({ name: 'section', type: 'varchar', length: 8, nullable: true })
  section!: string | null;

  // Created/updated by Principal userId
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => StudentTimetableSlot, (s) => s.timetable, {
    cascade: true,
  })
  slots?: StudentTimetableSlot[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
