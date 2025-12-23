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

import { RecapsService } from './recaps.service';
import { CreateRecapDto } from './dto/create-recap.dto';
import { UpdateRecapDto } from './dto/update-recap.dto';
import { RecapFilterQueryDto } from './dto/recap-filter.query.dto';

@Controller('recaps')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class RecapsController {
  constructor(private readonly service: RecapsService) {}

  @Post()
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateRecapDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async list(@CurrentUser() user: RequestUser, @Query() q: RecapFilterQueryDto) {
    return this.service.list(user, q);
  }

  @Get(':id')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getOne(user, params.id);
  }

  @Patch(':id')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async update(@CurrentUser() user: RequestUser, @Param() params: IdParamDto, @Body() dto: UpdateRecapDto) {
    return this.service.update(user, params.id, dto);
  }

  @Delete(':id')
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async remove(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.remove(user, params.id);
  }
}
