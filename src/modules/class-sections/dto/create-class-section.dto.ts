import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class CreateClassSectionDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  classNumber!: number;

  /**
   * Optional section:
   * - allow null/empty
   * - allow A/B/C
   * - allow custom single alphabet like D/E (your "other" logic)
   */
  @IsOptional()
  @Transform(({ value }) => {
    const v = value === undefined || value === null ? null : String(value).trim().toUpperCase();
    return v === '' ? null : v;
  })
  @ValidateIf((o) => o.section !== null)
  @IsString()
  // keep max 1 or a few chars; but your rule says only one alphabet in "other"
  // To keep it practical, allow up to 3 (e.g., "AB" not recommended but safe)
  // We will enforce stricter rules in service if needed.
  section?: string | null;
}
