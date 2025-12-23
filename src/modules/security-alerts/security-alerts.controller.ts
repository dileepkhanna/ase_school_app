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

import { SecurityAlertsService } from './security-alerts.service';
import { SecurityAlertFilterQueryDto } from './dto/security-alert-filter.query.dto';
import { MarkSeenDto } from './dto/mark-seen.dto';

@Controller('security-alerts')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class SecurityAlertsController {
  constructor(private readonly service: SecurityAlertsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: SecurityAlertFilterQueryDto) {
    return this.service.list(user, query);
  }

  @Post('mark-seen')
  async markSeen(@CurrentUser() user: RequestUser, @Body() dto: MarkSeenDto) {
    return this.service.markSeen(user, dto);
  }
}
