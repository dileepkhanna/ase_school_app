import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestUser } from '../../common/types/request-user.type';
import { Role } from '../../common/enums/role.enum';
import { ClassSection } from './entities/class-section.entity';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';

function normalizeSection(section: string | null | undefined): string | null {
  if (section === undefined || section === null) return null;
  const s = String(section).trim().toUpperCase();
  return s.length ? s : null;
}

@Injectable()
export class ClassSectionsService {
  constructor(
    @InjectRepository(ClassSection)
    private readonly repo: Repository<ClassSection>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private ensurePrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage classes');
  }

  async listMine(user: RequestUser): Promise<ClassSection[]> {
    const { schoolId } = this.assertSchoolScope(user);
    return this.repo.find({
      where: { schoolId },
      order: { classNumber: 'ASC', section: 'ASC' },
    });
  }

  async create(user: RequestUser, dto: CreateClassSectionDto): Promise<ClassSection> {
    this.ensurePrincipal(user);
    const { schoolId } = this.assertSchoolScope(user);

    const section = normalizeSection(dto.section ?? null);

    // Optional strict rule: section should be A/B/C or single letter.
    if (section && !/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('section must be a single alphabet letter (A-Z)');
    }

    const entity = this.repo.create({
      schoolId,
      classNumber: dto.classNumber,
      section,
    });

    try {
      return await this.repo.save(entity);
    } catch (e: any) {
      if (String(e?.code) === '23505') {
        throw new ConflictException('Class & section already exists');
      }
      throw e;
    }
  }

  async update(user: RequestUser, id: string, dto: UpdateClassSectionDto): Promise<ClassSection> {
    this.ensurePrincipal(user);
    const { schoolId } = this.assertSchoolScope(user);

    const row = await this.repo.findOne({ where: { id, schoolId } });
    if (!row) throw new NotFoundException('Class section not found');

    if (dto.classNumber !== undefined) row.classNumber = dto.classNumber;

    if (dto.section !== undefined) {
      const section = normalizeSection(dto.section ?? null);
      if (section && !/^[A-Z]{1}$/.test(section)) {
        throw new BadRequestException('section must be a single alphabet letter (A-Z)');
      }
      row.section = section;
    }

    try {
      return await this.repo.save(row);
    } catch (e: any) {
      if (String(e?.code) === '23505') {
        throw new ConflictException('Class & section already exists');
      }
      throw e;
    }
  }

  async remove(user: RequestUser, id: string): Promise<void> {
    this.ensurePrincipal(user);
    const { schoolId } = this.assertSchoolScope(user);

    const row = await this.repo.findOne({ where: { id, schoolId } });
    if (!row) throw new NotFoundException('Class section not found');

    // In a real app we may check if students/teachers are linked to this class-section before delete.
    await this.repo.remove(row);
  }
}