import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CircularType } from '../../../common/enums/circular-type.enum';

export class CircularListQueryDto extends PaginationDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsEnum(CircularType)
  type!: CircularType;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(80)
  search?: string; // title/description search
}
