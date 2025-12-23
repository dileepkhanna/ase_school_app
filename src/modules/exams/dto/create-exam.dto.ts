import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';

class ClassSectionItemDto {
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
}

export class CreateExamDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  examName!: string;

  /**
   * Example: "2025-2026"
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear!: string;

  /**
   * "YYYY-MM-DD"
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  startDate!: string;

  /**
   * "YYYY-MM-DD"
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  endDate!: string;

  /**
   * Applicable classes/sections
   */
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ClassSectionItemDto)
  classSections!: ClassSectionItemDto[];
}
