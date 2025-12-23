import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'schools' })
@Index('uq_schools_school_code', ['schoolCode'], { unique: true })
export class School {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'school_code', type: 'varchar', length: 32, unique: true })
  schoolCode!: string;

  @Column({ name: 'name', type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'geofence_lat', type: 'double precision', nullable: true })
  geofenceLat!: number | null;

  @Column({ name: 'geofence_lng', type: 'double precision', nullable: true })
  geofenceLng!: number | null;

  @Column({ name: 'geofence_radius_m', type: 'int', nullable: true })
  geofenceRadiusM!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
