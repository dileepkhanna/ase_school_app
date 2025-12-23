import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AttendanceRowDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  studentProfileId!: string;

  /**
   * Teacher marks only P or A.
   * Half-day (H) is computed using morning+afternoon.
   */
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['P', 'A'])
  status!: 'P' | 'A';
}

export class MarkAttendanceDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  classNumber!: number;

  @IsOptional()
  @Transform(({ value }) => {
    const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
    return v === '' ? undefined : v;
  })
  @IsString()
  @MaxLength(8)
  @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
  section?: string;

  /**
   * Date string "YYYY-MM-DD"
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  date!: string;

  /**
   * MORNING = first period
   * AFTERNOON = afternoon first period
   */
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['MORNING', 'AFTERNOON'])
  session!: 'MORNING' | 'AFTERNOON';

  /**
   * Attendance sheet rows
   */
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRowDto)
  rows!: AttendanceRowDto[];
}
