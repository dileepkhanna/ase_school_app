import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class MarkSeenDto {
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsUUID()
  alertId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  all?: boolean;

  // enforce either alertId or all=true
  @ValidateIf((o) => !o.all)
  @IsNotEmpty({ message: 'alertId is required when all is false' })
  validateAlertIdWhenNotAll?: true;

  @ValidateIf((o) => !o.alertId)
  @IsNotEmpty({ message: 'all=true is required when alertId is not provided' })
  validateAllWhenNoId?: true;
}
