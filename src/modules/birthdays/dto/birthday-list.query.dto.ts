import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class BirthdayListQueryDto {
  /**
   * teacher = upcoming teacher birthdays (Principal + Teacher)
   * student = today's classmates birthdays (Student)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  @IsIn(['teacher', 'student'])
  kind?: 'teacher' | 'student';

  /**
   * Used only for teacher upcoming list.
   * Default: 3 (T-3..T-0)
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(30)
  days?: number;
}
