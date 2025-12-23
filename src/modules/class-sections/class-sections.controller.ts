import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';
import { ClassSectionsService } from './class-sections.service';

@Controller('class-sections')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ClassSectionsController {
  constructor(private readonly service: ClassSectionsService) {}

  // Principal + Teacher can view class list (used in dropdowns)
  @Get()
  @Roles(Role.PRINCIPAL, Role.TEACHER)
  async listMine(@CurrentUser() user: RequestUser) {
    return this.service.listMine(user);
  }

  // Principal only create/update/delete
  @Post()
  @Roles(Role.PRINCIPAL)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateClassSectionDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.PRINCIPAL)
  async update(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateClassSectionDto,
  ) {
    return this.service.update(user, params.id, dto);
  }

  @Delete(':id')
  @Roles(Role.PRINCIPAL)
  async remove(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    await this.service.remove(user, params.id);
    return { message: 'Deleted' };
  }
}

