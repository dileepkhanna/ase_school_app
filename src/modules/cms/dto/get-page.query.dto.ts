import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

const STATIC_KEYS = ['PRIVACY_POLICY', 'TERMS', 'FAQ', 'ABOUT_ASE'] as const;
const SCHOOL_KEYS = ['ABOUT_SCHOOL'] as const;

export class GetStaticPageQueryDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(STATIC_KEYS as unknown as string[])
  key!: typeof STATIC_KEYS[number];
}

export class GetSchoolPageQueryDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(SCHOOL_KEYS as unknown as string[])
  key!: typeof SCHOOL_KEYS[number];

  /**
   * Optional: allow inactive read for principal/admin previews if needed later
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value).trim().toLowerCase() === 'true'))
  includeInactive?: boolean;
}
