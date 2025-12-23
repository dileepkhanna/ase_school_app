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

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { ReferralsStudentsService } from './referrals-students.service';
import { CreateStudentReferralDto } from './dto/create-student-referral.dto';
import { StudentReferralListQueryDto } from './dto/student-referral-list.query.dto';

@Controller('referrals-students')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ReferralsStudentsController {
  constructor(private readonly service: ReferralsStudentsService) {}

  /**
   * Teacher creates referral (and auto creates New Admission when 8.17 is wired)
   */
  @Post()
  @Roles(Role.TEACHER)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentReferralDto) {
    return this.service.create(user, dto);
  }

  /**
   * Teacher list + filters
   */
  @Get()
  @Roles(Role.TEACHER)
  async list(@CurrentUser() user: RequestUser, @Query() q: StudentReferralListQueryDto) {
    return this.service.listMy(user, q);
  }

  /**
   * Teacher summary cards
   */
  @Get('summary')
  @Roles(Role.TEACHER)
  async summary(@CurrentUser() user: RequestUser) {
    return this.service.mySummary(user);
  }
}
