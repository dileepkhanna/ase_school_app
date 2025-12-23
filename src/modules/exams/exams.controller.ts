import {
  Body,
  Controller,
  Get,
  Param,
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
import { IdParamDto } from '../../common/dto/id-param.dto';

import { ExamsService } from './exams.service';

import { CreateExamDto } from './dto/create-exam.dto';
import { AddExamScheduleDto } from './dto/add-exam-schedule.dto';
import { EnterMarksDto } from './dto/enter-marks.dto';
import { PublishResultDto } from './dto/publish-result.dto';
import { ExamListQueryDto } from './dto/exam-list.query.dto';

@Controller('exams')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  // -------------------------
  // Principal
  // -------------------------
  @Post()
  @Roles(Role.PRINCIPAL)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateExamDto) {
    return this.service.createExam(user, dto);
  }

  @Get()
  @Roles(Role.PRINCIPAL)
  async listPrincipal(@CurrentUser() user: RequestUser, @Query() q: ExamListQueryDto) {
    return this.service.listExamsPrincipal(user, q);
  }

  @Post('schedules')
  @Roles(Role.PRINCIPAL)
  async addSchedules(@CurrentUser() user: RequestUser, @Body() dto: AddExamScheduleDto) {
    return this.service.addSchedules(user, dto);
  }

  @Get(':id/schedules')
  @Roles(Role.PRINCIPAL)
  async schedules(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.principalExamSchedules(user, params.id);
  }

  @Get(':id/status')
  @Roles(Role.PRINCIPAL)
  async classStatus(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Query('classNumber') classNumber: string,
    @Query('section') section?: string,
  ) {
    const cn = Number(classNumber);
    if (!Number.isFinite(cn) || cn < 1 || cn > 12) throw new Error('classNumber must be 1..12');
    return this.service.principalClassStatus(user, { examId: params.id, classNumber: cn, section });
  }

  // -------------------------
  // Teacher
  // -------------------------
  @Get('teacher/my-schedules')
  @Roles(Role.TEACHER)
  async teacherSchedules(@CurrentUser() user: RequestUser, @Query('examId') examId?: string) {
    return this.service.getMySchedulesTeacher(user, { examId });
  }

  @Post('marks')
  @Roles(Role.TEACHER)
  async enterMarks(@CurrentUser() user: RequestUser, @Body() dto: EnterMarksDto) {
    return this.service.enterMarks(user, dto);
  }

  @Post('publish')
  @Roles(Role.TEACHER)
  async publish(@CurrentUser() user: RequestUser, @Body() dto: PublishResultDto) {
    return this.service.publishResult(user, dto);
  }

  // -------------------------
  // Student / Parent (same app)
  // -------------------------
  @Get('student/my-schedule')
  @Roles(Role.STUDENT)
  async studentSchedule(@CurrentUser() user: RequestUser, @Query('examId') examId?: string) {
    return this.service.getMyScheduleStudent(user, { examId });
  }

  @Get('student/my-result')
  @Roles(Role.STUDENT)
  async myResult(@CurrentUser() user: RequestUser, @Query('examId') examId: string) {
    return this.service.getMyResult(user, { examId });
  }
}
