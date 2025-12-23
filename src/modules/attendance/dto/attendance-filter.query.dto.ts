import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AttendanceFilterQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsUUID()
  studentProfileId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsUUID()
  teacherUserId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  classNumber?: number;

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
   * Date range (YYYY-MM-DD)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(10)
  fromDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(10)
  toDate?: string;

  /**
   * Convenience month/year filters (optional)
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
