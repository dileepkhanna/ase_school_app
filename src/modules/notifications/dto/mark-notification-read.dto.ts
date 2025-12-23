import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class MarkNotificationReadDto {
  /**
   * Mark a single notification as read
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsUUID()
  notificationId?: string;

  /**
   * Mark ALL notifications as read (for the current user)
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  all?: boolean;

  /**
   * Enforce: either notificationId OR all=true must be provided
   */
  @ValidateIf((o) => !o.all)
  @IsNotEmpty({ message: 'notificationId is required when all is false' })
  validateNotificationIdWhenNotAll?: true;

  @ValidateIf((o) => !o.notificationId)
  @IsNotEmpty({ message: 'all=true is required when notificationId is not provided' })
  validateAllWhenNoId?: true;
}
