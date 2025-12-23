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

import { ReferralsAseService } from './referrals-ase.service';
import { CreateAseReferralDto } from './dto/create-ase-referral.dto';
import { AseReferralListQueryDto } from './dto/ase-referral-list.query.dto';

@Controller('referrals-ase')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ReferralsAseController {
  constructor(private readonly service: ReferralsAseService) {}

  /**
   * Principal: create ASE referral
   */
  @Post()
  @Roles(Role.PRINCIPAL)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateAseReferralDto) {
    return this.service.create(user, dto);
  }

  /**
   * Principal: my referrals list (read-only)
   */
  @Get()
  @Roles(Role.PRINCIPAL)
  async listMy(@CurrentUser() user: RequestUser, @Query() q: AseReferralListQueryDto) {
    return this.service.listMy(user, q);
  }

  /**
   * Principal: one referral detail
   */
  @Get(':id')
  @Roles(Role.PRINCIPAL)
  async getOne(@CurrentUser() user: RequestUser, @Param() params: IdParamDto) {
    return this.service.getOneMy(user, params.id);
  }
}
