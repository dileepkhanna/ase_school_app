import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
  ) {}

  async createSchool(dto: CreateSchoolDto): Promise<School> {
    const schoolCode = dto.schoolCode.trim().toUpperCase();

    // If any geofence value is provided, require all 3
    const hasAnyGeo =
      dto.geofenceLat !== undefined || dto.geofenceLng !== undefined || dto.geofenceRadiusM !== undefined;
    const hasAllGeo =
      dto.geofenceLat !== undefined && dto.geofenceLng !== undefined && dto.geofenceRadiusM !== undefined;

    if (hasAnyGeo && !hasAllGeo) {
      throw new BadRequestException('Provide geofenceLat, geofenceLng and geofenceRadiusM together');
    }

    const existing = await this.schoolRepo.findOne({ where: { schoolCode } });
    if (existing) {
      throw new ConflictException(`School already exists with schoolCode=${schoolCode}`);
    }

    const school = this.schoolRepo.create({
      schoolCode,
      name: dto.name.trim(),
      logoUrl: dto.logoUrl?.trim() ?? null,
      geofenceLat: dto.geofenceLat ?? null,
      geofenceLng: dto.geofenceLng ?? null,
      geofenceRadiusM: dto.geofenceRadiusM ?? null,
      isActive: dto.isActive ?? true,
    });

    try {
      return await this.schoolRepo.save(school);
    } catch (e: any) {
      // handle unique constraint safely
      if (String(e?.code) === '23505') {
        throw new ConflictException('School code already exists');
      }
      throw e;
    }
  }

  async getSchoolByIdOrFail(schoolId: string): Promise<School> {
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async getMySchool(user: RequestUser): Promise<School> {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return this.getSchoolByIdOrFail(user.schoolId);
  }

  /**
   * Principal can update basic school info for their own school.
   * ASE_ADMIN can update isActive too (we enforce in controller).
   */
  async updateMySchool(user: RequestUser, dto: UpdateSchoolDto): Promise<School> {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');

    const school = await this.getSchoolByIdOrFail(user.schoolId);

    // Restrict fields: DO NOT allow schoolCode changes
    if (dto.schoolCode && dto.schoolCode.toUpperCase() !== school.schoolCode.toUpperCase()) {
      throw new BadRequestException('schoolCode cannot be changed');
    }

    // Only ASE_ADMIN can change isActive (extra safety)
    if (dto.isActive !== undefined && user.role !== Role.ASE_ADMIN) {
      throw new ForbiddenException('Only admin can change isActive');
    }

    if (dto.name !== undefined) school.name = dto.name.trim();
    if (dto.logoUrl !== undefined) school.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.isActive !== undefined) school.isActive = dto.isActive;

    // Ignore any accidental geofence fields in this DTO
    // (geofence is managed via updateGeofence)
    try {
      return await this.schoolRepo.save(school);
    } catch (e: any) {
      if (String(e?.code) === '23505') {
        throw new ConflictException('Duplicate constraint violation');
      }
      throw e;
    }
  }

  async updateMyGeofence(user: RequestUser, dto: UpdateGeofenceDto): Promise<School> {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');

    const school = await this.getSchoolByIdOrFail(user.schoolId);

    // You can optionally enforce "geofence must be enabled by admin only"
    // but per your requirement principal should be able to manage it.

    school.geofenceLat = dto.geofenceLat;
    school.geofenceLng = dto.geofenceLng;
    school.geofenceRadiusM = dto.geofenceRadiusM;

    return this.schoolRepo.save(school);
  }
}
