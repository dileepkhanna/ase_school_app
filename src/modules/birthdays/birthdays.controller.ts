import {
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

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { BirthdaysService } from './birthdays.service';
import { BirthdayListQueryDto } from './dto/birthday-list.query.dto';

@Controller('birthdays')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class BirthdaysController {
  constructor(private readonly service: BirthdaysService) {}

  /**
   * Principal/Teacher: teacher upcoming birthdays (T-3..T-0)
   * GET /birthdays/teachers?days=3
   */
  @Get('teachers')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async teacherUpcoming(@CurrentUser() user: RequestUser, @Query() q: BirthdayListQueryDto) {
    const days = q.days ?? 3;
    return this.service.listUpcomingTeacherBirthdays(user, days);
  }

  /**
   * Student: classmates birthdays ONLY today
   * GET /birthdays/students/today
   */
  @Get('students/today')
  @Roles(Role.STUDENT)
  async studentToday(@CurrentUser() user: RequestUser) {
    return this.service.listTodaysClassmateBirthdays(user);
  }

  /**
   * Manual trigger endpoint (until you add server cron)
   * POST /birthdays/teachers/dispatch?days=3
   */
  @Post('teachers/dispatch')
  @Roles(Role.PRINCIPAL)
  async dispatch(@CurrentUser() user: RequestUser, @Query() q: BirthdayListQueryDto) {
    const days = q.days ?? 3;
    return this.service.dispatchDailyTeacherBirthdayNotifications(user, days);
  }
}
