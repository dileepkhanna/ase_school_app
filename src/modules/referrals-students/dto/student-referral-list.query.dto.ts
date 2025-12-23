import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class StudentReferralListQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  applyingClass?: number;

  /**
   * Joined / Not Joined filter (teacher view)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['JOINED', 'NOT_JOINED'])
  admissionStatus?: 'JOINED' | 'NOT_JOINED';

  /**
   * Payment filter
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['DONE', 'PENDING'])
  paymentStatus?: 'DONE' | 'PENDING';

  /**
   * Reward filter
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['REWARDED', 'PENDING'])
  rewardStatus?: 'REWARDED' | 'PENDING';

  /**
   * Search (name or phone)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(60)
  search?: string;
}
