import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class LogoutDto {
  /**
   * Logout current device session
   */
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @Length(6, 128)
  deviceId!: string;

  /**
   * Optional: logout from all devices (Students might want this too).
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  allDevices?: boolean;
}
