import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class StudentListQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(60)
  search?: string; // name / email

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

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(9999)
  rollNumber?: number;
}
