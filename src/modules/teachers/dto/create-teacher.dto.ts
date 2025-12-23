import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '../../../common/enums/gender.enum';
import { PASSWORD_MIN_LENGTH } from '../../../config/constants';

export class CreateTeacherDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  teacherId!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  fullName!: string;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  gender!: Gender; // "MALE" | "FEMALE" | "OTHER"

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s]{8,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(2000)
  profilePhotoUrl?: string;

  /**
   * Accept date string "YYYY-MM-DD"
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(10)
  dob?: string;

  // Class teacher assignment (optional)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  classTeacherClass?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
    return v === '' ? undefined : v;
  })
  @IsString()
  @MaxLength(8)
  classTeacherSection?: string;

  /**
   * Preferred: array of subjects (we will store consistently in DB using JSON string)
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }) => (Array.isArray(value) ? value : undefined))
  @Type(() => String)
  subjects?: string[];

  /**
   * Temporary password created by Principal
   */
  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  temporaryPassword!: string;
}
