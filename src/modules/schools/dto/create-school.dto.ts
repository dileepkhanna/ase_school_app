import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DEFAULT_GEOFENCE_RADIUS_M } from '../../../config/constants';

export class CreateSchoolDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  schoolCode!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  // Optional geofence setup while creating school
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Max(90)
  @Min(-90)
  geofenceLat?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Max(180)
  @Min(-180)
  geofenceLng?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(50)
  @Max(2000)
  geofenceRadiusM?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;

  /**
   * Helper (optional) - not used directly by validator.
   */
  static defaultGeofenceRadius(): number {
    return DEFAULT_GEOFENCE_RADIUS_M;
  }
}
