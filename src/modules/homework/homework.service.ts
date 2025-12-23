import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { Homework } from './entities/homework.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { HomeworkFilterQueryDto } from './dto/homework-filter.query.dto';

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
export class HomeworkService {
  constructor(
    @InjectRepository(Homework) private readonly repo: Repository<Homework>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  // =========================================================
  // Create (Teacher only)
  // =========================================================
  async create(current: RequestUser, dto: CreateHomeworkDto) {
    if (current.role !== Role.TEACHER) throw new ForbiddenException('Only teachers can create homework');
    const { schoolId } = this.assertSchoolScope(current);

    const section = normalizeSection(dto.section ?? null);
    if (section && !/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('section must be a single alphabet letter (A-Z)');
    }

    const date = parseDateOrFail(dto.date);

    // If teacher is class teacher => restrict to that class/section
    const t = await this.teacherRepo.findOne({
      where: { schoolId, userId: current.userId },
    });
    if (!t) throw new ForbiddenException('Teacher profile not found');

    if (t.classTeacherClass) {
      const tSec = normalizeSection(t.classTeacherSection);
      if (dto.classNumber !== t.classTeacherClass) {
        throw new ForbiddenException('You can create homework only for your class');
      }
      if ((tSec ?? null) !== (section ?? null)) {
        throw new ForbiddenException('You can create homework only for your class section');
      }
    }

    const row = this.repo.create({
      schoolId,
      teacherUserId: current.userId,
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

  // =========================================================
  // List (Principal, Teacher, Student)
  // =========================================================
  async list(current: RequestUser, query: HomeworkFilterQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('h')
      .where('h.school_id = :schoolId', { schoolId })
      .andWhere('h.is_active = true');

    // Role-based visibility
    if (current.role === Role.PRINCIPAL) {
      // principal sees all homework (read-only)
    } else if (current.role === Role.TEACHER) {
      qb.andWhere('h.teacher_user_id = :tid', { tid: current.userId });
    } else if (current.role === Role.STUDENT) {
      const profile = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } });
      if (!profile) throw new NotFoundException('Student profile not found');

      const sec = normalizeSection(profile.section);
      qb.andWhere('h.class_number = :c', { c: profile.classNumber });

      if (sec === null) qb.andWhere('h.section IS NULL');
      else qb.andWhere('h.section = :s', { s: sec });
    } else {
      throw new ForbiddenException('Unknown role');
    }

    // Optional filters (mostly for principal/teacher usage)
    if (query.teacherUserId) qb.andWhere('h.teacher_user_id = :tuid', { tuid: query.teacherUserId.trim() });
    if (query.classNumber) qb.andWhere('h.class_number = :cn', { cn: query.classNumber });

    if (query.section !== undefined) {
      const sec = normalizeSection(query.section);
      if (sec) qb.andWhere('h.section = :sec', { sec });
      else qb.andWhere('h.section IS NULL');
    }

    if (query.subject) qb.andWhere('LOWER(COALESCE(h.subject, \'\')) LIKE :sub', { sub: `%${query.subject.trim().toLowerCase()}%` });

    if (query.fromDate) qb.andWhere('h.date >= :from', { from: parseDateOrFail(query.fromDate) });
    if (query.toDate) qb.andWhere('h.date <= :to', { to: parseDateOrFail(query.toDate) });

    if (query.search) {
      const s = query.search.trim();
      qb.andWhere(
        new Brackets((b) => {
          b.where('h.content ILIKE :q', { q: `%${s}%` });
        }),
      );
    }

    qb.orderBy('h.date', 'DESC').addOrderBy('h.created_at', 'DESC').skip(query.skip).take(query.take);

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
  async getOne(current: RequestUser, id: string) {
    const { schoolId } = this.assertSchoolScope(current);

    const h = await this.repo.findOne({ where: { id, schoolId, isActive: true } });
    if (!h) throw new NotFoundException('Homework not found');

    // Access control (same as list)
    if (current.role === Role.PRINCIPAL) return this.map(h);

    if (current.role === Role.TEACHER) {
      if (h.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');
      return this.map(h);
    }

    if (current.role === Role.STUDENT) {
      const profile = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } });
      if (!profile) throw new NotFoundException('Student profile not found');

      const sec = normalizeSection(profile.section);
      if (h.classNumber !== profile.classNumber) throw new ForbiddenException('Access denied');
      if ((normalizeSection(h.section) ?? null) !== (sec ?? null)) throw new ForbiddenException('Access denied');

      return this.map(h);
    }

    throw new ForbiddenException('Unknown role');
  }

  // =========================================================
  // Update (Teacher only, own homework)
  // =========================================================
  async update(current: RequestUser, id: string, dto: UpdateHomeworkDto) {
    if (current.role !== Role.TEACHER) throw new ForbiddenException('Only teachers can update homework');
    const { schoolId } = this.assertSchoolScope(current);

    const h = await this.repo.findOne({ where: { id, schoolId, isActive: true } });
    if (!h) throw new NotFoundException('Homework not found');

    if (h.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');

    // Teacher can update content/attachments/subject/date.
    // We do NOT allow changing class/section to prevent misuse.
    if (dto.date !== undefined) h.date = parseDateOrFail(dto.date);
    if (dto.content !== undefined) h.content = dto.content.trim();
    if (dto.attachments !== undefined) h.attachments = dto.attachments?.length ? dto.attachments : null;
    if (dto.subject !== undefined) h.subject = dto.subject?.trim() ?? null;

    const saved = await this.repo.save(h);
    return this.map(saved);
  }

  // =========================================================
  // Delete (Teacher only, own homework) - soft delete
  // =========================================================
  async remove(current: RequestUser, id: string) {
    if (current.role !== Role.TEACHER) throw new ForbiddenException('Only teachers can delete homework');
    const { schoolId } = this.assertSchoolScope(current);

    const h = await this.repo.findOne({ where: { id, schoolId, isActive: true } });
    if (!h) throw new NotFoundException('Homework not found');

    if (h.teacherUserId !== current.userId) throw new ForbiddenException('Access denied');

    h.isActive = false;
    await this.repo.save(h);

    return { message: 'Deleted' };
  }

  private map(h: Homework) {
    return {
      id: h.id,
      schoolId: h.schoolId,
      teacherUserId: h.teacherUserId,
      classNumber: h.classNumber,
      section: h.section,
      subject: h.subject,
      date: dateStr(h.date),
      content: h.content,
      attachments: h.attachments ?? [],
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    };
  }
}
