import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AseReferralListQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['SUBMITTED', 'VERIFIED', 'IN_DEVELOPMENT', 'DELIVERED', 'PAYMENT_RECEIVED', 'REWARD_PAID'])
  status?: 'SUBMITTED' | 'VERIFIED' | 'IN_DEVELOPMENT' | 'DELIVERED' | 'PAYMENT_RECEIVED' | 'REWARD_PAID';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsIn(['PAID', 'NOT_PAID'])
  payoutStatus?: 'PAID' | 'NOT_PAID';

  /**
   * Search by: referId / phone / referredSchoolName / candidateName
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(80)
  search?: string;
}
