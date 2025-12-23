import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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

import { AdmissionsService } from './admissions.service';
import { AdmissionListQueryDto } from './dto/admission-list.query.dto';
import { UpdateAdmissionStatusDto } from './dto/update-admission-status.dto';

@Controller('admissions')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  /**
   * Principal: list admissions created ONLY from referrals
   */
  @Get()
  @Roles(Role.PRINCIPAL)
  async list(@CurrentUser() user: RequestUser, @Query() q: AdmissionListQueryDto) {
    return this.service.list(user, q);
  }

  /**
   * Principal: get admission detail
   */
  @Get(':id')
  @Roles(Role.PRINCIPAL)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getOne(user, params.id);
  }

  /**
   * Principal: update admissionStatus + paymentStatus
   */
  @Patch(':id/status')
  @Roles(Role.PRINCIPAL)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateAdmissionStatusDto,
  ) {
    return this.service.updateStatus(user, params.id, dto);
  }
}
