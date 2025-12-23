import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { Recap } from './entities/recap.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { CreateRecapDto } from './dto/create-recap.dto';
import { UpdateRecapDto } from './dto/update-recap.dto';
import { RecapFilterQueryDto } from './dto/recap-filter.query.dto';

function normalizeSection(section?: string | null): string | null {
  if (section === undefined || section === null) return null;
  const s = String(section).trim().toUpperCase();
  return s.length ? s : null;
}

function parseDateOrFail(v: string): Date {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException('date must be YYYY-MM-DD');
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class RecapsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Recap) private readonly repo: Repository<Recap>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  // =========================================================
  // Create
  // =========================================================
  async create(current: RequestUser, dto: CreateRecapDto) {
    const { schoolId } = this.assertSchoolScope(current);
    const date = parseDateOrFail(dto.date);

    // Principal Self Recap
    if (current.role === Role.PRINCIPAL) {
      const row = this.repo.create({
        schoolId,
        teacherUserId: null,
        createdByPrincipalUserId: current.userId,
        classNumber: null,
        section: null,
        subject: null,
        date,
        content: dto.content.trim(),
        attachments: dto.attachments?.length ? dto.attachments : null,
        isActive: true,
      });
      const saved = await this.repo.save(row);
      return this.map(saved);
    }

    // Teacher Recap
    if (current.role === Role.TEACHER) {
      if (!dto.classNumber) throw new BadRequestException('classNumber is required for teacher recap');
      const section = normalizeSection(dto.section ?? null);

      if (section && !/^[A-Z]{1}$/.test(section)) {
        throw new BadRequestException('section must be a single alphabet letter (A-Z)');
      }

      // If teacher is class teacher, allow only their class/section.
      // If not class teacher, allow but still requires class/section in request.
      const t = await this.teacherRepo.findOne({
        where: { schoolId, userId: current.userId },
      });
      if (!t) throw new ForbiddenException('Teacher profile not found');

      if (t.classTeacherClass) {
        const tSec = normalizeSection(t.classTeacherSection);
        if (dto.classNumber !== t.classTeacherClass) {
          throw new ForbiddenException('You can create recap only for your class');
        }
        if ((tSec ?? null) !== (section ?? null)) {
          throw new ForbiddenException('You can create recap only for your class section');
        }
      }

      const row = this.repo.create({
        schoolId,
        teacherUserId: current.userId,
        createdByPrincipalUserId: null,
        classNumber: dto.classNumber,
        section,
        subject: dto.subject?.trim() ?? null,
        date,
        content: dto.content.trim(),
        attachments: dto.attachments?.length ? dto.attachments : null,
        isActive: true,
      });

      const saved = await this.repo.save(row);
      return this.map(saved);
    }

    throw new ForbiddenException('Students cannot create recaps');
  }

  // =========================================================
  // List
  // =========================================================
  async list(current: RequestUser, query: RecapFilterQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.school_id = :schoolId', { schoolId })
      .andWhere('r.is_active = true');

    // Role-based visibility
    if (current.role === Role.PRINCIPAL) {
      // Principal sees:
      // - teacher recaps (teacherUserId NOT NULL)
      // - principal self recaps (createdByPrincipalUserId = current.userId)
      qb.andWhere(
        new Brackets((b) => {
          b.where('r.teacher_user_id IS NOT NULL').orWhere('r.created_by_principal_user_id = :pid', {
            pid: current.userId,
          });
        }),
      );
    } else if (current.role === Role.TEACHER) {
      // Teacher sees only their recaps
      qb.andWhere('r.teacher_user_id = :tid', { tid: current.userId });
    } else if (current.role === Role.STUDENT) {
      // Student sees only their class/section teacher recaps
      const profile = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } });
      if (!profile) throw new NotFoundException('Student profile not found');

      const sec = normalizeSection(profile.section);
      qb.andWhere('r.teacher_user_id IS NOT NULL')
        .andWhere('r.class_number = :c', { c: profile.classNumber });

      if (sec === null) qb.andWhere('r.section IS NULL');
      else qb.andWhere('r.section = :s', { s: sec });
    } else {
      throw new ForbiddenException('Unknown role');
    }

    // Filters (Principal has most flexibility)
    if (query.teacherUserId) {
      qb.andWhere('r.teacher_user_id = :tuid', { tuid: query.teacherUserId.trim() });
    }

    if (query.classNumber) qb.andWhere('r.class_number = :cn', { cn: query.classNumber });

    if (query.section !== undefined) {
      const sec = normalizeSection(query.section);
      if (sec) qb.andWhere('r.section = :sec', { sec });
      else qb.andWhere('r.section IS NULL');
    }

    if (query.subject) qb.andWhere('LOWER(COALESCE(r.subject, \'\')) LIKE :sub', { sub: `%${query.subject.trim().toLowerCase()}%` });

    if (query.fromDate) qb.andWhere('r.date >= :from', { from: parseDateOrFail(query.fromDate) });
    if (query.toDate) qb.andWhere('r.date <= :to', { to: parseDateOrFail(query.toDate) });

    if (query.search) {
      const s = query.search.trim();
      qb.andWhere('r.content ILIKE :q', { q: `%${s}%` });
    }

    qb.orderBy('r.date', 'DESC').addOrderBy('r.created_at', 'DESC').skip(query.skip).take(query.take);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((r) => this.map(r)),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }

  // =========================================================
  // Get One
  // =========================================================
  async getOne(current: RequestUser, recapId: string) {
    const { schoolId } = this.assertSchoolScope(current);

    const r = await this.repo.findOne({ where: { id: recapId, schoolId, isActive: true } });
    if (!r) throw new NotFoundException('Recap not found');

    // Access control
    if (current.role === Role.PRINCIPAL) {
      const isTeacherRecap = !!r.teacherUserId;
      const isMySelfRecap = r.createdByPrincipalUserId === current.userId;
      if (!isTeacherRecap && !isMySelfRecap) throw new ForbiddenException('Access denied');
    } else if (current.role === Role.TEACHER) {
      if (r.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');
    } else if (current.role === Role.STUDENT) {
      const profile = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } });
      if (!profile) throw new NotFoundException('Student profile not found');

      if (!r.teacherUserId) throw new ForbiddenException('Access denied');

      const sec = normalizeSection(profile.section);
      if (r.classNumber !== profile.classNumber) throw new ForbiddenException('Access denied');
      if ((normalizeSection(r.section) ?? null) !== (sec ?? null)) throw new ForbiddenException('Access denied');
    }

    return this.map(r);
  }

  // =========================================================
  // Update
  // =========================================================
  async update(current: RequestUser, recapId: string, dto: UpdateRecapDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const r = await this.repo.findOne({ where: { id: recapId, schoolId, isActive: true } });
    if (!r) throw new NotFoundException('Recap not found');

    // Only owner can update:
    if (current.role === Role.PRINCIPAL) {
      if (r.createdByPrincipalUserId !== current.userId) {
        // Principal cannot edit teacher recaps
        throw new ForbiddenException('Principal cannot edit teacher recaps');
      }
    } else if (current.role === Role.TEACHER) {
      if (r.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');
    } else {
      throw new ForbiddenException('Students cannot edit recaps');
    }

    if (dto.date !== undefined) r.date = parseDateOrFail(dto.date);
    if (dto.content !== undefined) r.content = dto.content.trim();
    if (dto.attachments !== undefined) r.attachments = dto.attachments?.length ? dto.attachments : null;

    // For teacher recaps allow changing subject only (class/section should not drift casually)
    if (current.role === Role.TEACHER) {
      if (dto.subject !== undefined) r.subject = dto.subject?.trim() ?? null;
    }

    // For principal self recap ignore teacher-only fields even if sent
    if (current.role === Role.PRINCIPAL) {
      r.classNumber = null;
      r.section = null;
      r.subject = null;
      r.teacherUserId = null;
    }

    const saved = await this.repo.save(r);
    return this.map(saved);
  }

  // =========================================================
  // Delete
  // =========================================================
  async remove(current: RequestUser, recapId: string) {
    const { schoolId } = this.assertSchoolScope(current);

    const r = await this.repo.findOne({ where: { id: recapId, schoolId, isActive: true } });
    if (!r) throw new NotFoundException('Recap not found');

    // Teacher can delete only own recap; Principal can delete only own self recap
    if (current.role === Role.PRINCIPAL) {
      if (r.createdByPrincipalUserId !== current.userId) {
        throw new ForbiddenException('Principal cannot delete teacher recaps');
      }
    } else if (current.role === Role.TEACHER) {
      if (r.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');
    } else {
      throw new ForbiddenException('Students cannot delete recaps');
    }

    // soft delete
    r.isActive = false;
    await this.repo.save(r);

    return { message: 'Deleted' };
  }

  private map(r: Recap) {
    return {
      id: r.id,
      schoolId: r.schoolId,
      teacherUserId: r.teacherUserId,
      createdByPrincipalUserId: r.createdByPrincipalUserId,
      classNumber: r.classNumber,
      section: r.section,
      subject: r.subject,
      date: dateStr(r.date),
      content: r.content,
      attachments: r.attachments ?? [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
