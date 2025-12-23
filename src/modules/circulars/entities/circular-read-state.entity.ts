import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CircularType } from '../../../common/enums/circular-type.enum';

@Entity({ name: 'circular_read_states' })
@Index('uq_circular_read_state', ['schoolId', 'userId', 'type'], { unique: true })
export class CircularReadState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'type', type: 'enum', enum: CircularType, enumName: 'circular_type_enum' })
  type!: CircularType;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
