import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class CreatePresignedUrlDto {
  /**
   * Where this file will be used (helps you organize folders on R2)
   * Example: "profiles", "circulars", "recaps", "homework"
   */
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  folder!: string;

  /**
   * original file name from client (we will sanitize)
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  filename!: string;

  /**
   * MIME type like: image/jpeg, image/png, application/pdf
   */
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  contentType!: string;

  /**
   * Bytes size, used for validation (optional)
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50 MB
  sizeBytes?: number;

  /**
   * If you want to restrict uploads to images/pdf etc. from backend quickly
   * DEFAULT: "ANY"
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['IMAGE', 'PDF', 'ANY'])
  kind?: 'IMAGE' | 'PDF' | 'ANY';
}
