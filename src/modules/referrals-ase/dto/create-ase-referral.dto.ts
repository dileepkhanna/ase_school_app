import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateAseReferralDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  referredSchoolName!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  candidateName!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber must be exactly 10 digits' })
  phoneNumber!: string;
}
