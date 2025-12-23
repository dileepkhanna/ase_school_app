import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AdmissionListQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  applyingClass?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['JOINED', 'NOT_JOINED'])
  admissionStatus?: 'JOINED' | 'NOT_JOINED';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['DONE', 'PENDING'])
  paymentStatus?: 'DONE' | 'PENDING';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['REWARDED', 'PENDING'])
  rewardStatus?: 'REWARDED' | 'PENDING';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(60)
  search?: string; // name or phone or teacher name
}
