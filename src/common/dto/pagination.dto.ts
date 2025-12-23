import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../config/constants';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  get skip(): number {
    const page = this.page ?? 1;
    const limit = this.limit ?? DEFAULT_PAGE_SIZE;
    return (page - 1) * limit;
  }

  get take(): number {
    return this.limit ?? DEFAULT_PAGE_SIZE;
  }
}
