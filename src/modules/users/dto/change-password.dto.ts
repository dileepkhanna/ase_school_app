import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../../config/constants';

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).+$/;

export class ChangePasswordDto {
  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

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

  /**
   * We’ll validate confirmNewPassword match inside the service for better error handling.
   * We’ll also validate STRONG_PASSWORD_REGEX inside the service to return a clean message.
   */
  static isStrongPassword(pw: string): boolean {
    return STRONG_PASSWORD_REGEX.test(pw);
  }
}
