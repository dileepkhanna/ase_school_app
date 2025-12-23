// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Query,
//   Post,
//   UseGuards,
//   UsePipes,
//   ValidationPipe,
// } from '@nestjs/common';
// import { Transform } from 'class-transformer';
// import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

// import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { CurrentUser } from '../../common/decorators/current-user.decorator';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';

// import { TimetablesService } from './timetables.service';
// import { CreateTeacherTimetableDto } from './dto/create-teacher-timetable.dto';
// import { UpdateTeacherTimetableDto } from './dto/update-teacher-timetable.dto';
// import { CreateStudentTimetableDto } from './dto/create-student-timetable.dto';
// import { UpdateStudentTimetableDto } from './dto/update-student-timetable.dto';

// class TeacherTTQueryDto {
//   @IsString()
//   teacherUserId!: string;
// }

// class StudentTTQueryDto {
//   @Transform(({ value }) => Number(value))
//   @IsInt()
//   @Min(1)
//   @Max(12)
//   classNumber!: number;

//   @IsOptional()
//   @Transform(({ value }) => {
//     const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
//     return v === '' ? undefined : v;
//   })
//   @IsString()
//   @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
//   section?: string;
// }

// @Controller('timetables')
// @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
// @UsePipes(
//   new ValidationPipe({
//     whitelist: true,
//     transform: true,
//     forbidNonWhitelisted: true,
//   }),
// )
// export class TimetablesController {
//   constructor(private readonly service: TimetablesService) {}

//   // =========================================================
//   // Teacher Timetable
//   // =========================================================

//   // Principal: create or replace teacher timetable
//   @Post('teacher')
//   @Roles(Role.PRINCIPAL)
//   async createTeacher(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: update or replace teacher timetable
//   @Post('teacher/update')
//   @Roles(Role.PRINCIPAL)
//   async updateTeacher(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: list all teacher timetables with teacher cards
//   @Get('teacher')
//   @Roles(Role.PRINCIPAL)
//   async listTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.listTeacherTimetables(user);
//   }

//   // Principal: get teacher timetable by teacherUserId
//   @Get('teacher/by-teacher')
//   @Roles(Role.PRINCIPAL)
//   async getTeacherByTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.getTeacherTimetableByTeacherUserId(user, q.teacherUserId);
//   }

//   // Teacher: my timetable
//   @Get('teacher/my')
//   @Roles(Role.TEACHER)
//   async myTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.getMyTeacherTimetable(user);
//   }

//   // Principal: delete teacher timetable by teacherUserId
//   @Delete('teacher')
//   @Roles(Role.PRINCIPAL)
//   async deleteTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.deleteTeacherTimetable(user, q.teacherUserId);
//   }

//   // =========================================================
//   // Student Timetable
//   // =========================================================

//   // Principal: create/replace student timetable (class+section)
//   @Post('student')
//   @Roles(Role.PRINCIPAL)
//   async createStudent(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: update/replace student timetable
//   @Post('student/update')
//   @Roles(Role.PRINCIPAL)
//   async updateStudent(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: list all student timetables
//   @Get('student')
//   @Roles(Role.PRINCIPAL)
//   async listStudent(@CurrentUser() user: RequestUser) {
//     return this.service.listStudentTimetables(user);
//   }

//   // Principal: get student timetable by class/section
//   @Get('student/by-class')
//   @Roles(Role.PRINCIPAL)
//   async getStudentByClass(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.getStudentTimetableByClass(user, q.classNumber, section);
//   }

//   // Student: my timetable (auto class/section)
//   @Get('student/my')
//   @Roles(Role.STUDENT)
//   async myStudent(@CurrentUser() user: RequestUser) {
//     return this.service.getMyStudentTimetable(user);
//   }

//   // Principal: delete by class/section
//   @Delete('student')
//   @Roles(Role.PRINCIPAL)
//   async deleteStudent(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.deleteStudentTimetable(user, q.classNumber, section);
//   }
// }











// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   UseGuards,
//   UsePipes,
//   ValidationPipe,
// } from '@nestjs/common';
// import { Transform } from 'class-transformer';
// import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

// import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { CurrentUser } from '../../common/decorators/current-user.decorator';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';

// import { TimetablesService } from './timetables.service';
// import { CreateTeacherTimetableDto } from './dto/create-teacher-timetable.dto';
// import { UpdateTeacherTimetableDto } from './dto/update-teacher-timetable.dto';
// import { CreateStudentTimetableDto } from './dto/create-student-timetable.dto';
// import { UpdateStudentTimetableDto } from './dto/update-student-timetable.dto';

// class TeacherTTQueryDto {
//   @IsString()
//   teacherUserId!: string;
// }

// class StudentTTQueryDto {
//   @Transform(({ value }) => Number(value))
//   @IsInt()
//   @Min(1)
//   @Max(12)
//   classNumber!: number;

//   @IsOptional()
//   @Transform(({ value }) => {
//     const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
//     return v === '' ? undefined : v;
//   })
//   @IsString()
//   @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
//   section?: string;
// }

// @Controller('timetables')
// @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
// @UsePipes(
//   new ValidationPipe({
//     whitelist: true,
//     transform: true,
//     forbidNonWhitelisted: true,
//   }),
// )
// export class TimetablesController {
//   constructor(private readonly service: TimetablesService) {}

//   // =========================================================
//   // Teacher Timetable
//   // =========================================================

//   // Principal: create/replace teacher timetable
//   @Post('teacher')
//   @Roles(Role.PRINCIPAL)
//   async upsertTeacher(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: update/replace teacher timetable (kept for backward compatibility)
//   @Post('teacher/update')
//   @Roles(Role.PRINCIPAL)
//   async upsertTeacherUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: PATCH endpoint (nice for Swagger/REST)
//   @Patch('teacher')
//   @Roles(Role.PRINCIPAL)
//   async patchTeacher(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: list all teacher timetables with teacher cards
//   @Get('teacher')
//   @Roles(Role.PRINCIPAL)
//   async listTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.listTeacherTimetables(user);
//   }

//   // ✅ NEW: Principal/Teacher: get teacher timetable by path param
//   // This fixes your 404: GET /api/timetables/teacher/{teacherUserId}
//   @Get('teacher/:teacherUserId')
//   async getTeacherById(
//     @CurrentUser() user: RequestUser,
//     @Param('teacherUserId') teacherUserId: string,
//   ) {
//     // Service already blocks access if not principal and not self
//     return this.service.getTeacherTimetableByTeacherUserId(user, teacherUserId);
//   }

//   // Existing query-style endpoint (kept)
//   @Get('teacher/by-teacher')
//   @Roles(Role.PRINCIPAL)
//   async getTeacherByTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.getTeacherTimetableByTeacherUserId(user, q.teacherUserId);
//   }

//   // Teacher: my timetable
//   @Get('teacher/my')
//   @Roles(Role.TEACHER)
//   async myTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.getMyTeacherTimetable(user);
//   }

//   // ✅ NEW: Principal delete by path param (optional but useful)
//   @Delete('teacher/:teacherUserId')
//   @Roles(Role.PRINCIPAL)
//   async deleteTeacherByParam(@CurrentUser() user: RequestUser, @Param('teacherUserId') teacherUserId: string) {
//     return this.service.deleteTeacherTimetable(user, teacherUserId);
//   }

//   // Existing query-style delete (kept)
//   @Delete('teacher')
//   @Roles(Role.PRINCIPAL)
//   async deleteTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.deleteTeacherTimetable(user, q.teacherUserId);
//   }

//   // =========================================================
//   // Student Timetable
//   // =========================================================

//   // Principal: create/replace student timetable (class+section)
//   @Post('student')
//   @Roles(Role.PRINCIPAL)
//   async upsertStudent(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: update/replace student timetable (kept for backward compatibility)
//   @Post('student/update')
//   @Roles(Role.PRINCIPAL)
//   async upsertStudentUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: PATCH endpoint (nice for Swagger/REST)
//   @Patch('student')
//   @Roles(Role.PRINCIPAL)
//   async patchStudent(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: list all student timetables
//   @Get('student')
//   @Roles(Role.PRINCIPAL)
//   async listStudent(@CurrentUser() user: RequestUser) {
//     return this.service.listStudentTimetables(user);
//   }

//   // Principal: get student timetable by class/section
//   @Get('student/by-class')
//   @Roles(Role.PRINCIPAL)
//   async getStudentByClass(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.getStudentTimetableByClass(user, q.classNumber, section);
//   }

//   // Student: my timetable (auto class/section)
//   @Get('student/my')
//   @Roles(Role.STUDENT)
//   async myStudent(@CurrentUser() user: RequestUser) {
//     return this.service.getMyStudentTimetable(user);
//   }

//   // Principal: delete by class/section
//   @Delete('student')
//   @Roles(Role.PRINCIPAL)
//   async deleteStudent(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.deleteStudentTimetable(user, q.classNumber, section);
//   }
// }











// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   UseGuards,
//   UsePipes,
//   ValidationPipe,
// } from '@nestjs/common';
// import { Transform } from 'class-transformer';
// import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

// import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { CurrentUser } from '../../common/decorators/current-user.decorator';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';

// import { TimetablesService } from './timetables.service';
// import { CreateTeacherTimetableDto } from './dto/create-teacher-timetable.dto';
// import { UpdateTeacherTimetableDto } from './dto/update-teacher-timetable.dto';
// import { CreateStudentTimetableDto } from './dto/create-student-timetable.dto';
// import { UpdateStudentTimetableDto } from './dto/update-student-timetable.dto';

// class TeacherTTQueryDto {
//   @IsString()
//   teacherUserId!: string;
// }

// class StudentTTQueryDto {
//   @Transform(({ value }) => Number(value))
//   @IsInt()
//   @Min(1)
//   @Max(12)
//   classNumber!: number;

//   @IsOptional()
//   @Transform(({ value }) => {
//     const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
//     return v === '' ? undefined : v;
//   })
//   @IsString()
//   @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
//   section?: string;
// }

// @Controller('timetables')
// @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
// @UsePipes(
//   new ValidationPipe({
//     whitelist: true,
//     transform: true,
//     forbidNonWhitelisted: true,
//   }),
// )
// export class TimetablesController {
//   constructor(private readonly service: TimetablesService) {}

//   // =========================================================
//   // Teacher Timetable
//   // =========================================================

//   // Principal: create/replace teacher timetable
//   @Post('teacher')
//   @Roles(Role.PRINCIPAL)
//   async upsertTeacher(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: update/replace teacher timetable (kept for backward compatibility)
//   @Post('teacher/update')
//   @Roles(Role.PRINCIPAL)
//   async upsertTeacherUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: PATCH endpoint (nice for Swagger/REST)
//   @Patch('teacher')
//   @Roles(Role.PRINCIPAL)
//   async patchTeacher(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
//     return this.service.upsertTeacherTimetable(user, dto);
//   }

//   // Principal: list all teacher timetables with teacher cards
//   @Get('teacher')
//   @Roles(Role.PRINCIPAL)
//   async listTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.listTeacherTimetables(user);
//   }

//   // Principal/Teacher: get teacher timetable by path param
//   // GET /api/timetables/teacher/{teacherUserId}
//   @Get('teacher/:teacherUserId')
//   async getTeacherById(@CurrentUser() user: RequestUser, @Param('teacherUserId') teacherUserId: string) {
//     return this.service.getTeacherTimetableByTeacherUserId(user, teacherUserId);
//   }

//   // Existing query-style endpoint (kept)
//   @Get('teacher/by-teacher')
//   @Roles(Role.PRINCIPAL)
//   async getTeacherByTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.getTeacherTimetableByTeacherUserId(user, q.teacherUserId);
//   }

//   // Teacher: my timetable
//   @Get('teacher/my')
//   @Roles(Role.TEACHER)
//   async myTeacher(@CurrentUser() user: RequestUser) {
//     return this.service.getMyTeacherTimetable(user);
//   }

//   // Principal delete by path param
//   @Delete('teacher/:teacherUserId')
//   @Roles(Role.PRINCIPAL)
//   async deleteTeacherByParam(@CurrentUser() user: RequestUser, @Param('teacherUserId') teacherUserId: string) {
//     return this.service.deleteTeacherTimetable(user, teacherUserId);
//   }

//   // Existing query-style delete (kept)
//   @Delete('teacher')
//   @Roles(Role.PRINCIPAL)
//   async deleteTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
//     return this.service.deleteTeacherTimetable(user, q.teacherUserId);
//   }

//   // =========================================================
//   // Student Timetable
//   // =========================================================

//   // Principal: create/replace student timetable (class+section)
//   @Post('student')
//   @Roles(Role.PRINCIPAL)
//   async upsertStudent(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: update/replace student timetable (kept for backward compatibility)
//   @Post('student/update')
//   @Roles(Role.PRINCIPAL)
//   async upsertStudentUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: PATCH endpoint (nice for Swagger/REST)
//   @Patch('student')
//   @Roles(Role.PRINCIPAL)
//   async patchStudent(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
//     return this.service.upsertStudentTimetable(user, dto);
//   }

//   // Principal: list all student timetables
//   @Get('student')
//   @Roles(Role.PRINCIPAL)
//   async listStudent(@CurrentUser() user: RequestUser) {
//     return this.service.listStudentTimetables(user);
//   }

//   // ✅ NEW (what you want):
//   // GET /api/timetables/student/8/B
//   @Get('student/:classNumber/:section')
//   @Roles(Role.PRINCIPAL)
//   async getStudentByPath(
//     @CurrentUser() user: RequestUser,
//     @Param('classNumber') classNumberRaw: string,
//     @Param('section') sectionRaw: string,
//   ) {
//     const classNumber = Number(classNumberRaw);
//     if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
//       // keep it simple, ValidationPipe doesn't run for manual conversion
//       throw new Error('classNumber must be between 1 and 12');
//     }

//     const section = String(sectionRaw).trim().toUpperCase();
//     if (!/^[A-Z]{1}$/.test(section)) {
//       throw new Error('section must be a single alphabet letter (A-Z)');
//     }

//     return this.service.getStudentTimetableByClass(user, classNumber, section);
//   }

//   // ✅ NEW (nullable section):
//   // GET /api/timetables/student/8  -> section = null
//   @Get('student/:classNumber')
//   @Roles(Role.PRINCIPAL)
//   async getStudentByPathNullableSection(
//     @CurrentUser() user: RequestUser,
//     @Param('classNumber') classNumberRaw: string,
//   ) {
//     const classNumber = Number(classNumberRaw);
//     if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
//       throw new Error('classNumber must be between 1 and 12');
//     }
//     return this.service.getStudentTimetableByClass(user, classNumber, null);
//   }

//   // Existing query-style endpoint (kept)
//   @Get('student/by-class')
//   @Roles(Role.PRINCIPAL)
//   async getStudentByClass(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.getStudentTimetableByClass(user, q.classNumber, section);
//   }

//   // ✅ NEW name (matches your message):
//   // Student: my timetable
//   @Get('student/me')
//   @Roles(Role.STUDENT)
//   async myStudent(@CurrentUser() user: RequestUser) {
//     return this.service.getMyStudentTimetable(user);
//   }

//   // (kept) old route if you already used it somewhere
//   @Get('student/my')
//   @Roles(Role.STUDENT)
//   async myStudentOld(@CurrentUser() user: RequestUser) {
//     return this.service.getMyStudentTimetable(user);
//   }

//   // ✅ NEW delete (what you want):
//   // DELETE /api/timetables/student/8/B
//   @Delete('student/:classNumber/:section')
//   @Roles(Role.PRINCIPAL)
//   async deleteStudentByPath(
//     @CurrentUser() user: RequestUser,
//     @Param('classNumber') classNumberRaw: string,
//     @Param('section') sectionRaw: string,
//   ) {
//     const classNumber = Number(classNumberRaw);
//     if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
//       throw new Error('classNumber must be between 1 and 12');
//     }

//     const section = String(sectionRaw).trim().toUpperCase();
//     if (!/^[A-Z]{1}$/.test(section)) {
//       throw new Error('section must be a single alphabet letter (A-Z)');
//     }

//     return this.service.deleteStudentTimetable(user, classNumber, section);
//   }

//   // ✅ NEW delete nullable section:
//   // DELETE /api/timetables/student/8  -> deletes section=null timetable
//   @Delete('student/:classNumber')
//   @Roles(Role.PRINCIPAL)
//   async deleteStudentByPathNullableSection(
//     @CurrentUser() user: RequestUser,
//     @Param('classNumber') classNumberRaw: string,
//   ) {
//     const classNumber = Number(classNumberRaw);
//     if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
//       throw new Error('classNumber must be between 1 and 12');
//     }
//     return this.service.deleteStudentTimetable(user, classNumber, null);
//   }

//   // Existing query-style delete (kept)
//   @Delete('student')
//   @Roles(Role.PRINCIPAL)
//   async deleteStudent(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
//     const section = q.section ? q.section.trim().toUpperCase() : null;
//     return this.service.deleteStudentTimetable(user, q.classNumber, section);
//   }
// }









import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { TimetablesService } from './timetables.service';
import { CreateTeacherTimetableDto } from './dto/create-teacher-timetable.dto';
import { UpdateTeacherTimetableDto } from './dto/update-teacher-timetable.dto';
import { CreateStudentTimetableDto } from './dto/create-student-timetable.dto';
import { UpdateStudentTimetableDto } from './dto/update-student-timetable.dto';

class TeacherTTQueryDto {
  @IsString()
  teacherUserId!: string;
}

class StudentTTQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  classNumber!: number;

  @IsOptional()
  @Transform(({ value }) => {
    const v = value === undefined || value === null ? undefined : String(value).trim().toUpperCase();
    return v === '' ? undefined : v;
  })
  @IsString()
  @Matches(/^[A-Z]{1}$/, { message: 'section must be a single alphabet letter (A-Z)' })
  section?: string;
}

@Controller('timetables')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class TimetablesController {
  constructor(private readonly service: TimetablesService) {}

  // =========================================================
  // Teacher Timetable
  // =========================================================

  @Post('teacher')
  @Roles(Role.PRINCIPAL)
  async upsertTeacher(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherTimetableDto) {
    return this.service.upsertTeacherTimetable(user, dto);
  }

  @Post('teacher/update')
  @Roles(Role.PRINCIPAL)
  async upsertTeacherUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
    return this.service.upsertTeacherTimetable(user, dto);
  }

  @Patch('teacher')
  @Roles(Role.PRINCIPAL)
  async patchTeacher(@CurrentUser() user: RequestUser, @Body() dto: UpdateTeacherTimetableDto) {
    return this.service.upsertTeacherTimetable(user, dto);
  }

  @Get('teacher')
  @Roles(Role.PRINCIPAL)
  async listTeacher(@CurrentUser() user: RequestUser) {
    return this.service.listTeacherTimetables(user);
  }

  @Get('teacher/:teacherUserId')
  async getTeacherById(@CurrentUser() user: RequestUser, @Param('teacherUserId') teacherUserId: string) {
    return this.service.getTeacherTimetableByTeacherUserId(user, teacherUserId);
  }

  @Get('teacher/by-teacher')
  @Roles(Role.PRINCIPAL)
  async getTeacherByTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
    return this.service.getTeacherTimetableByTeacherUserId(user, q.teacherUserId);
  }

  @Get('teacher/my')
  @Roles(Role.TEACHER)
  async myTeacher(@CurrentUser() user: RequestUser) {
    return this.service.getMyTeacherTimetable(user);
  }

  @Delete('teacher/:teacherUserId')
  @Roles(Role.PRINCIPAL)
  async deleteTeacherByParam(@CurrentUser() user: RequestUser, @Param('teacherUserId') teacherUserId: string) {
    return this.service.deleteTeacherTimetable(user, teacherUserId);
  }

  @Delete('teacher')
  @Roles(Role.PRINCIPAL)
  async deleteTeacher(@CurrentUser() user: RequestUser, @Query() q: TeacherTTQueryDto) {
    return this.service.deleteTeacherTimetable(user, q.teacherUserId);
  }

  // =========================================================
  // Student Timetable
  // =========================================================

  @Post('student')
  @Roles(Role.PRINCIPAL)
  async upsertStudent(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentTimetableDto) {
    return this.service.upsertStudentTimetable(user, dto);
  }

  @Post('student/update')
  @Roles(Role.PRINCIPAL)
  async upsertStudentUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
    return this.service.upsertStudentTimetable(user, dto);
  }

  @Patch('student')
  @Roles(Role.PRINCIPAL)
  async patchStudent(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudentTimetableDto) {
    return this.service.upsertStudentTimetable(user, dto);
  }

  @Get('student')
  @Roles(Role.PRINCIPAL)
  async listStudent(@CurrentUser() user: RequestUser) {
    return this.service.listStudentTimetables(user);
  }

  // ✅ IMPORTANT: put /me BEFORE /:classNumber so it doesn't get treated as classNumber="me"
  @Get('student/me')
  @Roles(Role.STUDENT)
  async myStudent(@CurrentUser() user: RequestUser) {
    return this.service.getMyStudentTimetable(user);
  }

  // (kept) old route if already used
  @Get('student/my')
  @Roles(Role.STUDENT)
  async myStudentOld(@CurrentUser() user: RequestUser) {
    return this.service.getMyStudentTimetable(user);
  }

  // Existing query-style endpoint (kept)
  @Get('student/by-class')
  @Roles(Role.PRINCIPAL)
  async getStudentByClass(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
    const section = q.section ? q.section.trim().toUpperCase() : null;
    return this.service.getStudentTimetableByClass(user, q.classNumber, section);
  }

  // GET /api/timetables/student/8/B
  @Get('student/:classNumber/:section')
  @Roles(Role.PRINCIPAL)
  async getStudentByPath(
    @CurrentUser() user: RequestUser,
    @Param('classNumber') classNumberRaw: string,
    @Param('section') sectionRaw: string,
  ) {
    const classNumber = Number(classNumberRaw);
    if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
      throw new BadRequestException('classNumber must be between 1 and 12');
    }

    const section = String(sectionRaw).trim().toUpperCase();
    if (!/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('section must be a single alphabet letter (A-Z)');
    }

    return this.service.getStudentTimetableByClass(user, classNumber, section);
  }

  // GET /api/timetables/student/8  -> section=null
  @Get('student/:classNumber')
  @Roles(Role.PRINCIPAL)
  async getStudentByPathNullableSection(
    @CurrentUser() user: RequestUser,
    @Param('classNumber') classNumberRaw: string,
  ) {
    const classNumber = Number(classNumberRaw);
    if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
      throw new BadRequestException('classNumber must be between 1 and 12');
    }
    return this.service.getStudentTimetableByClass(user, classNumber, null);
  }

  // DELETE /api/timetables/student/8/B
  @Delete('student/:classNumber/:section')
  @Roles(Role.PRINCIPAL)
  async deleteStudentByPath(
    @CurrentUser() user: RequestUser,
    @Param('classNumber') classNumberRaw: string,
    @Param('section') sectionRaw: string,
  ) {
    const classNumber = Number(classNumberRaw);
    if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
      throw new BadRequestException('classNumber must be between 1 and 12');
    }

    const section = String(sectionRaw).trim().toUpperCase();
    if (!/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('section must be a single alphabet letter (A-Z)');
    }

    return this.service.deleteStudentTimetable(user, classNumber, section);
  }

  // DELETE /api/timetables/student/8  -> deletes section=null timetable
  @Delete('student/:classNumber')
  @Roles(Role.PRINCIPAL)
  async deleteStudentByPathNullableSection(
    @CurrentUser() user: RequestUser,
    @Param('classNumber') classNumberRaw: string,
  ) {
    const classNumber = Number(classNumberRaw);
    if (!Number.isFinite(classNumber) || classNumber < 1 || classNumber > 12) {
      throw new BadRequestException('classNumber must be between 1 and 12');
    }
    return this.service.deleteStudentTimetable(user, classNumber, null);
  }

  // Existing query-style delete (kept)
  @Delete('student')
  @Roles(Role.PRINCIPAL)
  async deleteStudent(@CurrentUser() user: RequestUser, @Query() q: StudentTTQueryDto) {
    const section = q.section ? q.section.trim().toUpperCase() : null;
    return this.service.deleteStudentTimetable(user, q.classNumber, section);
  }
}
