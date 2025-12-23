import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsService } from './schools.service';

@Controller('schools')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  /**
   * Admin-only: create a school record.
   * (In your business flow, this is used by ASE Admin Panel / scripts)
   */
  @Post()
  @Roles(Role.ASE_ADMIN)
  async create(@Body() dto: CreateSchoolDto) {
    const school = await this.schoolsService.createSchool(dto);
    return {
      id: school.id,
      schoolCode: school.schoolCode,
      name: school.name,
      logoUrl: school.logoUrl,
      geofenceLat: school.geofenceLat,
      geofenceLng: school.geofenceLng,
      geofenceRadiusM: school.geofenceRadiusM,
      isActive: school.isActive,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }

  /**
   * Principal/Teacher/Student: view their own school (About School page).
   */
  @Get('me')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async getMySchool(@CurrentUser() user: RequestUser) {
    const school = await this.schoolsService.getMySchool(user);
    return {
      id: school.id,
      schoolCode: school.schoolCode,
      name: school.name,
      logoUrl: school.logoUrl,
      geofenceLat: school.geofenceLat,
      geofenceLng: school.geofenceLng,
      geofenceRadiusM: school.geofenceRadiusM,
      isActive: school.isActive,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }

  /**
   * Principal: update their school basic details (name/logo).
   */
  @Patch('me')
  @Roles(Role.PRINCIPAL)
  async updateMySchool(@CurrentUser() user: RequestUser, @Body() dto: UpdateSchoolDto) {
    const school = await this.schoolsService.updateMySchool(user, dto);
    return {
      id: school.id,
      schoolCode: school.schoolCode,
      name: school.name,
      logoUrl: school.logoUrl,
      isActive: school.isActive,
      updatedAt: school.updatedAt,
    };
  }

  /**
   * Principal: update geofence (used for Teacher geo-login restriction).
   */
  @Patch('me/geofence')
  @Roles(Role.PRINCIPAL)
  async updateMyGeofence(@CurrentUser() user: RequestUser, @Body() dto: UpdateGeofenceDto) {
    const school = await this.schoolsService.updateMyGeofence(user, dto);
    return {
      id: school.id,
      schoolCode: school.schoolCode,
      geofenceLat: school.geofenceLat,
      geofenceLng: school.geofenceLng,
      geofenceRadiusM: school.geofenceRadiusM,
      updatedAt: school.updatedAt,
    };
  }
}
