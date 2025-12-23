import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

class TeacherTimetableSlotDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number; // 1=Mon ... 7=Sun

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  timing!: string; // e.g., "09:10 - 09:50"

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

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  assignedTeacherUserId!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(500)
  sortOrder?: number;
}

export class CreateTeacherTimetableDto {
  /**
   * Teacher for whom the timetable is created
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  teacherUserId!: string;

  /**
   * Slots added in one save
   */
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TeacherTimetableSlotDto)
  slots!: TeacherTimetableSlotDto[];
}
