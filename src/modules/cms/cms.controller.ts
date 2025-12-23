import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { CmsService } from './cms.service';

import { GetSchoolPageQueryDto, GetStaticPageQueryDto } from './dto/get-page.query.dto';
import { UpdateSchoolPageDto, UpdateStaticPageDto } from './dto/update-page.dto';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

@Controller('cms')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class CmsController {
  constructor(private readonly service: CmsService) {}

  /**
   * PUBLIC: static pages for app drawer (privacy/terms/faq/about)
   * GET /cms/static?key=PRIVACY_POLICY
   */
  @Get('static')
  async getStatic(@Query() q: GetStaticPageQueryDto) {
    return this.service.getStaticPage(q.key);
  }

  /**
   * AUTH: school-specific pages (About School)
   * GET /cms/school?key=ABOUT_SCHOOL
   */
  @Get('school')
  @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async getSchool(@CurrentUser() user: RequestUser, @Query() q: GetSchoolPageQueryDto) {
    return this.service.getSchoolPage(user, q.key, q.includeInactive ?? false);
  }

  /**
   * ADMIN: update static pages
   * PATCH /cms/static
   */
  @Patch('static')
  @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
  @Roles((Role as any).ADMIN)
  async upsertStatic(@CurrentUser() user: RequestUser, @Body() dto: UpdateStaticPageDto) {
    return this.service.upsertStaticPage(user, dto);
  }

  /**
   * PRINCIPAL/ADMIN: update school pages (About School)
   * PATCH /cms/school
   */
  @Patch('school')
  @UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
  @Roles(Role.PRINCIPAL, (Role as any).ADMIN)
  async upsertSchool(@CurrentUser() user: RequestUser, @Body() dto: UpdateSchoolPageDto) {
    return this.service.upsertSchoolPage(user, dto);
  }
}
