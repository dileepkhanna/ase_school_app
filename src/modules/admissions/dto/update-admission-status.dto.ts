import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdmissionStatusDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['JOINED', 'NOT_JOINED'])
  admissionStatus!: 'JOINED' | 'NOT_JOINED';

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['DONE', 'PENDING'])
  paymentStatus!: 'DONE' | 'PENDING';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(200)
  note?: string; // optional note for audit/notification
}
