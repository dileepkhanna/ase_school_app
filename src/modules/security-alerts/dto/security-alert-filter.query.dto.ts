import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SecurityAlertFilterQueryDto extends PaginationDto {
  /**
   * NEW / SEEN / undefined (all)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  @IsString()
  @IsIn(['NEW', 'SEEN'])
  status?: 'NEW' | 'SEEN';

  /**
   * GEO_LOGIN_ATTEMPT etc.
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(60)
  type?: string;
}
