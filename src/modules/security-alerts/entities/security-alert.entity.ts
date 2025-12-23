import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'security_alerts' })
@Index('idx_security_alerts_school_status_created', ['schoolId', 'status', 'createdAt'])
export class SecurityAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'teacher_user_id', type: 'uuid', nullable: true })
  teacherUserId!: string | null;

  @Column({ name: 'teacher_name', type: 'varchar', length: 200, nullable: true })
  teacherName!: string | null;

  /**
   * For now only GEO_LOGIN_ATTEMPT is used (from AuthService).
   * Later we can extend types.
   */
  @Column({ name: 'type', type: 'varchar', length: 60 })
  type!: string; // e.g. "GEO_LOGIN_ATTEMPT"

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'distance_m', type: 'int', nullable: true })
  distanceM!: number | null;

  @Column({ name: 'attempted_lat', type: 'double precision', nullable: true })
  attemptedLat!: number | null;

  @Column({ name: 'attempted_lng', type: 'double precision', nullable: true })
  attemptedLng!: number | null;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'NEW' })
  status!: 'NEW' | 'SEEN';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
