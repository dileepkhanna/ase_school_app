import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  schoolCode!: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email!: string;
}
