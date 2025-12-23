import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class LoginDto {
  /**
   * Requirement: School Code + Email + Password
   */
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  schoolCode!: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  password!: string;

  /**
   * Used for single-device login enforcement (Principal/Teacher) and session binding.
   * Should be a stable per-install/per-device id from the app.
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  deviceId!: string;

  /**
   * Optional: store/update push token at login
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @Length(20, 4096)
  fcmToken?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim().toLowerCase()))
  @IsString()
  @Length(2, 20)
  platform?: string; // android / ios

  /**
   * Optional: for Teacher geo-restricted login (we validate later in AuthService).
   * Parent/Student can ignore these fields.
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(-180)
  @Max(180)
  lng?: number;
}
