import { Transform } from 'class-transformer';
import {
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

export class CreateStudentDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  fullName!: string;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  gender!: Gender; // MALE/FEMALE/OTHER

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(9999)
  rollNumber!: number;

  /**
   * Accept date string "YYYY-MM-DD"
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(10)
  dob?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(2000)
  profilePhotoUrl?: string;

  /**
   * Requirement: 10 digit only (India-style)
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @Matches(/^\d{10}$/, { message: 'mobileNumber must be exactly 10 digits' })
  mobileNumber?: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  classNumber!: number;

  @IsOptional()
  @Transform(({ value }) => {
    const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
    return v === '' ? undefined : v;
  })
  @IsString()
  @MaxLength(8)
  @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
  section?: string;

  /**
   * Temporary password created by Principal/Teacher
   */
  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  temporaryPassword!: string;

  /**
   * Optional: for future parent linkage, admission source etc.
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @Length(0, 200)
  notes?: string;
}
