import {
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

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { IdParamDto } from '../../common/dto/id-param.dto';

import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentListQueryDto } from './dto/student-list.query.dto';

@Controller('students')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  /**
   * Principal + Teacher:
   * - Principal can create for any class
   * - Teacher can create ONLY for their class (enforced in service)
   */
  @Post()
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateStudentDto) {
    return this.service.createStudent(user, dto);
  }

  /**
   * Principal + Teacher:
   * - Principal can list all (with filters)
   * - Teacher can list ONLY their class (enforced in service)
   */
  @Get()
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async list(@CurrentUser() user: RequestUser, @Query() query: StudentListQueryDto) {
    return this.service.listStudents(user, query);
  }

  @Get(':id')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getStudentById(user, params.id);
  }

  /**
   * Principal only (teacher is view-only)
   */
  @Patch(':id')
  @Roles(Role.PRINCIPAL)
  async update(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.service.updateStudent(user, params.id, dto);
  }

  /**
   * Principal only (teacher is view-only)
   */
  @Delete(':id')
  @Roles(Role.PRINCIPAL)
  async remove(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    await this.service.deleteStudent(user, params.id);
    return { message: 'Deleted' };
  }
}
