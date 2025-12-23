import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';

import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto } from './dto/notification-list.query.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';

@Controller('notifications')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async listMine(@CurrentUser() user: RequestUser, @Query() query: NotificationListQueryDto) {
    return this.service.listMine(user, query);
  }

  /**
   * Mark read:
   * - { notificationId: "..." } OR { all: true }
   */
  @Post('mark-read')
  async markRead(@CurrentUser() user: RequestUser, @Body() dto: MarkNotificationReadDto) {
    return this.service.markRead(user, dto);
  }
}
