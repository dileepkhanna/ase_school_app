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
import { IsEnum } from 'class-validator';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { CircularType } from '../../common/enums/circular-type.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { IdParamDto } from '../../common/dto/id-param.dto';

import { CircularsService } from './circulars.service';
import { CreateCircularDto } from './dto/create-circular.dto';
import { UpdateCircularDto } from './dto/update-circular.dto';
import { CircularListQueryDto } from './dto/circular-list.query.dto';

class MarkSeenBodyDto {
  @IsEnum(CircularType)
  type!: CircularType;
}

@Controller('circulars')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class CircularsController {
  constructor(private readonly service: CircularsService) {}

  // Principal: create
  @Post()
  @Roles(Role.PRINCIPAL)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateCircularDto) {
    return this.service.create(user, dto);
  }

  // All roles: list by type
  @Get()
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async list(@CurrentUser() user: RequestUser, @Query() query: CircularListQueryDto) {
    return this.service.list(user, query);
  }

  // All roles: detail
  @Get(':id')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getOne(user, params.id);
  }

  // Principal: update
  @Patch(':id')
  @Roles(Role.PRINCIPAL)
  async update(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCircularDto,
  ) {
    return this.service.update(user, params.id, dto);
  }

  // Principal: delete
  @Delete(':id')
  @Roles(Role.PRINCIPAL)
  async remove(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.remove(user, params.id);
  }

  // Mark seen (category open)
  @Post('mark-seen')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async markSeen(@CurrentUser() user: RequestUser, @Body() dto: MarkSeenBodyDto) {
    return this.service.markSeen(user, dto.type);
  }

  // Unseen count for one type
  @Get('unseen/count')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async unseenCount(@CurrentUser() user: RequestUser, @Query('type') type: CircularType) {
    return this.service.unseenCount(user, type);
  }

  // Unseen counts for all types
  @Get('unseen/all')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async unseenAll(@CurrentUser() user: RequestUser) {
    return this.service.unseenCountsAll(user);
  }
}
