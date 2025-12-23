import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class NotificationListQueryDto extends PaginationDto {
  /**
   * Filter read/unread
   * - true => read only
   * - false => unread only
   * - undefined => all
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  isRead?: boolean;

  /**
   * Optional free-text search on title/body (simple)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(80)
  search?: string;
}
