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

import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherListQueryDto } from './dto/teacher-list.query.dto';

@Controller('teachers')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class TeachersController {
  constructor(private readonly service: TeachersService) {}

  /**
   * Principal: create teacher (creates user + profile)
   */
  @Post()
  @Roles(Role.PRINCIPAL)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherDto) {
    return this.service.createTeacher(user, dto);
  }

  /**
   * Principal: list teachers with filters + pagination
   */
  @Get()
  @Roles(Role.PRINCIPAL)
  async list(@CurrentUser() user: RequestUser, @Query() query: TeacherListQueryDto) {
    return this.service.listTeachers(user, query);
  }

  /**
   * Principal: view teacher details
   */
  @Get(':id')
  @Roles(Role.PRINCIPAL)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getTeacherById(user, params.id);
  }

  /**
   * Principal: update teacher
   */
  @Patch(':id')
  @Roles(Role.PRINCIPAL)
  async update(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.service.updateTeacher(user, params.id, dto);
  }

  /**
   * Principal: delete teacher (confirm popup on app)
   */
  @Delete(':id')
  @Roles(Role.PRINCIPAL)
  async remove(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    await this.service.deleteTeacher(user, params.id);
    return { message: 'Deleted' };
  }
}
