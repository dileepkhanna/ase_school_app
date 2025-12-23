import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../../config/constants';

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).+$/;

export class ResetPasswordDto {
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

  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;

  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  confirmNewPassword!: string;

  static isStrongPassword(pw: string): boolean {
    return STRONG_PASSWORD_REGEX.test(pw);
  }
}
