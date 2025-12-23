import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const STATIC_KEYS = ['PRIVACY_POLICY', 'TERMS', 'FAQ', 'ABOUT_ASE'] as const;
const SCHOOL_KEYS = ['ABOUT_SCHOOL'] as const;

export class UpdateStaticPageDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(STATIC_KEYS as unknown as string[])
  key!: typeof STATIC_KEYS[number];

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MaxLength(140)
  title!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Boolean(value)))
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSchoolPageDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(SCHOOL_KEYS as unknown as string[])
  key!: typeof SCHOOL_KEYS[number];

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MaxLength(140)
  title!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Boolean(value)))
  @IsBoolean()
  isActive?: boolean;
}
