import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class FinalizeUploadDto {
  /**
   * Object key returned from presigned creation
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  key!: string;

  /**
   * Public URL returned from presigned creation
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUrl({ require_tld: false })
  url!: string;

  /**
   * Optional: checksum or etag from client (future use)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(120)
  etag?: string;
}
