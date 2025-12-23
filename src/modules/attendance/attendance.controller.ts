import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { AttendanceStatus } from '../../common/enums/attendance.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceFilterQueryDto } from './dto/attendance-filter.query.dto';
import { ExportAttendanceQueryDto } from './dto/export-attendance.query.dto';

class SetTeacherAttendanceDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  teacherUserId!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MaxLength(10)
  date!: string; // YYYY-MM-DD

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  notes?: string;
}

@Controller('attendance')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // =========================
  // Teacher: mark attendance (submit)
  // =========================
  @Post('students/mark')
  @Roles(Role.TEACHER)
  async mark(@CurrentUser() user: RequestUser, @Body() dto: MarkAttendanceDto) {
    return this.service.markStudentAttendance(user, dto);
  }

  // =========================
  // Student: my attendance calendar + percentage
  // =========================
  @Get('students/my')
  @Roles(Role.STUDENT)
  async my(@CurrentUser() user: RequestUser, @Query() q: AttendanceFilterQueryDto) {
    return this.service.getMyAttendance(user, q);
  }

  // =========================
  // Principal/Teacher: class sheet (month/year)
  // =========================
  @Get('students/sheet')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async sheet(@CurrentUser() user: RequestUser, @Query() q: ExportAttendanceQueryDto) {
    return this.service.getClassSheet(user, q);
  }

  // =========================
  // Principal/Teacher: export CSV
  // =========================
  @Get('students/export')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async export(@CurrentUser() user: RequestUser, @Query() q: ExportAttendanceQueryDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.service.exportClassAttendanceCsv(user, q);
    const filename = `attendance_${q.classNumber}${q.section ? q.section.toUpperCase() : ''}_${q.month}_${q.year}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  // =========================
  // Teacher: my teacher attendance calendar + percentage
  // =========================
  @Get('teachers/my')
  @Roles(Role.TEACHER)
  async myTeacher(@CurrentUser() user: RequestUser, @Query() q: AttendanceFilterQueryDto) {
    return this.service.getMyTeacherAttendance(user, q);
  }

  // =========================
  // Principal: teacher attendance calendar + percentage
  // =========================
  @Get('teachers/by-teacher')
  @Roles(Role.PRINCIPAL)
  async principalTeacher(@CurrentUser() user: RequestUser, @Query() q: AttendanceFilterQueryDto) {
    return this.service.principalTeacherAttendance(user, q);
  }

  // =========================
  // Principal: set teacher attendance (manual for now)
  // =========================
  @Post('teachers/set')
  @Roles(Role.PRINCIPAL)
  async setTeacher(@CurrentUser() user: RequestUser, @Body() dto: SetTeacherAttendanceDto) {
    return this.service.setTeacherAttendanceByPrincipal(user, dto);
  }
}
