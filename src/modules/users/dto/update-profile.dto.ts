import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  /**
   * Phone can be updated (optional) — keep generic because some schools may store landlines.
   * You can make it strict 10 digits if you want (India-only).
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s]{8,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  /**
   * Device-based biometrics is verified on device;
   * backend stores user preference (true/false).
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  biometricsEnabled?: boolean;
}
