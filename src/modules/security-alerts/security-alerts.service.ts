import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { SecurityAlert } from './entities/security-alert.entity';
import { SecurityAlertFilterQueryDto } from './dto/security-alert-filter.query.dto';
import { MarkSeenDto } from './dto/mark-seen.dto';

@Injectable()
export class SecurityAlertsService {
  constructor(
    @InjectRepository(SecurityAlert)
    private readonly repo: Repository<SecurityAlert>,
  ) {}

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can access security alerts');
  }

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  async list(current: RequestUser, query: SecurityAlertFilterQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.school_id = :schoolId', { schoolId });

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.type) qb.andWhere('a.type = :type', { type: query.type });

    qb.orderBy('a.created_at', 'DESC').skip(query.skip).take(query.take);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        teacherUserId: r.teacherUserId,
        teacherName: r.teacherName,
        distanceM: r.distanceM,
        attemptedLat: r.attemptedLat,
        attemptedLng: r.attemptedLng,
        status: r.status,
        createdAt: r.createdAt,
      })),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }

  async markSeen(current: RequestUser, dto: MarkSeenDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    if (dto.all === true) {
      await this.repo
        .createQueryBuilder()
        .update(SecurityAlert)
        .set({ status: 'SEEN' })
        .where('school_id = :schoolId AND status = :status', { schoolId, status: 'NEW' })
        .execute();

      return { message: 'All alerts marked as seen' };
    }

    if (!dto.alertId) throw new BadRequestException('alertId or all=true is required');

    const row = await this.repo.findOne({ where: { id: dto.alertId, schoolId } });
    if (!row) throw new NotFoundException('Security alert not found');

    if (row.status !== 'SEEN') {
      row.status = 'SEEN';
      await this.repo.save(row);
    }

    return { message: 'Alert marked as seen' };
  }
}
