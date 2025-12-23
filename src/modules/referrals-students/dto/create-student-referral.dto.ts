import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, Matches } from 'class-validator';

export class CreateStudentReferralDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  studentName!: string;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender!: 'MALE' | 'FEMALE' | 'OTHER';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  applyingClass!: number;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber must be exactly 10 digits' })
  phoneNumber!: string;
}
