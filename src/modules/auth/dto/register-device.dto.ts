import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDeviceDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  deviceId!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(20, 4096)
  fcmToken!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim().toLowerCase()))
  @IsString()
  @Length(2, 20)
  platform?: string; // android / ios
}
