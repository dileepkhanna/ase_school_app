import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { StaticPage } from './entities/static-page.entity';
import { SchoolPage } from './entities/school-page.entity';

import { UpdateSchoolPageDto, UpdateStaticPageDto } from './dto/update-page.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(StaticPage) private readonly staticRepo: Repository<StaticPage>,
    @InjectRepository(SchoolPage) private readonly schoolRepo: Repository<SchoolPage>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  // -----------------------------
  // Public Static Pages (no auth)
  // -----------------------------
  async getStaticPage(key: string) {
    const page = await this.staticRepo.findOne({ where: { key, isActive: true } });
    if (!page) throw new NotFoundException('Page not found');
    return this.mapStatic(page);
  }

  // -----------------------------------
  // School Pages (auth + school scoped)
  // -----------------------------------
  async getSchoolPage(current: RequestUser, key: string, includeInactive = false) {
    const { schoolId } = this.assertSchoolScope(current);

    const page = await this.schoolRepo.findOne({
      where: includeInactive ? { schoolId, key } : { schoolId, key, isActive: true },
    });

    if (!page) throw new NotFoundException('Page not found');
    return this.mapSchool(page);
  }

  // -----------------------------------
  // Admin: Upsert static page
  // -----------------------------------
  async upsertStaticPage(current: RequestUser, dto: UpdateStaticPageDto) {
    // Only ADMIN should edit global CMS pages
    if (current.role !== (Role as any).ADMIN) {
      throw new ForbiddenException('Only admin can update static pages');
    }

    const existing = await this.staticRepo.findOne({ where: { key: dto.key } });
    if (!existing) {
      const created = await this.staticRepo.save(
        this.staticRepo.create({
          key: dto.key,
          title: dto.title.trim(),
          content: dto.content.trim(),
          isActive: dto.isActive ?? true,
        }),
      );
      return this.mapStatic(created);
    }

    existing.title = dto.title.trim();
    existing.content = dto.content.trim();
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    const saved = await this.staticRepo.save(existing);
    return this.mapStatic(saved);
  }

  // -----------------------------------
  // Principal/Admin: Upsert school page
  // -----------------------------------
  async upsertSchoolPage(current: RequestUser, dto: UpdateSchoolPageDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const isAdmin = current.role === (Role as any).ADMIN;
    const isPrincipal = current.role === Role.PRINCIPAL;

    if (!isAdmin && !isPrincipal) {
      throw new ForbiddenException('Only principal/admin can update school pages');
    }

    const existing = await this.schoolRepo.findOne({ where: { schoolId, key: dto.key } });

    if (!existing) {
      const created = await this.schoolRepo.save(
        this.schoolRepo.create({
          schoolId,
          key: dto.key,
          title: dto.title.trim(),
          content: dto.content.trim(),
          isActive: dto.isActive ?? true,
          updatedByUserId: current.userId,
        }),
      );
      return this.mapSchool(created);
    }

    existing.title = dto.title.trim();
    existing.content = dto.content.trim();
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    existing.updatedByUserId = current.userId;

    const saved = await this.schoolRepo.save(existing);
    return this.mapSchool(saved);
  }

  private mapStatic(p: StaticPage) {
    return {
      key: p.key,
      title: p.title,
      content: p.content,
      updatedAt: p.updatedAt,
    };
  }

  private mapSchool(p: SchoolPage) {
    return {
      key: p.key,
      title: p.title,
      content: p.content,
      updatedAt: p.updatedAt,
    };
  }
}
