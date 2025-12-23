import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class StudentTimetableSlotDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  timing!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(500)
  sortOrder?: number;
}

export class CreateStudentTimetableDto {
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

  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => StudentTimetableSlotDto)
  slots!: StudentTimetableSlotDto[];
}
