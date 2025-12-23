import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PublishResultDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  examId!: string;

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
  section?: string;

  /**
   * Optional: override grade thresholds later.
   * For now, publish will compute using default grade scale (in service).
   */
}
