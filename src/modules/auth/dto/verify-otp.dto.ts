import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  schoolCode!: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  @Matches(/^\d+$/, { message: 'otp must be numeric' })
  otp!: string;
}
