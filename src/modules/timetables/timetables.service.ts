import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { User } from '../users/entities/user.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { TeacherTimetable } from './entities/teacher-timetable.entity';
import { TeacherTimetableSlot } from './entities/teacher-timetable-slot.entity';
import { StudentTimetable } from './entities/student-timetable.entity';
import { StudentTimetableSlot } from './entities/student-timetable-slot.entity';

import { CreateTeacherTimetableDto } from './dto/create-teacher-timetable.dto';
import { UpdateTeacherTimetableDto } from './dto/update-teacher-timetable.dto';
import { CreateStudentTimetableDto } from './dto/create-student-timetable.dto';
import { UpdateStudentTimetableDto } from './dto/update-student-timetable.dto';

function normalizeSection(section?: string | null): string | null {
  if (section === undefined || section === null) return null;
  const s = String(section).trim().toUpperCase();
  return s.length ? s : null;
}

function assertSingleLetterSectionOrNull(section: string | null) {
  if (section === null) return;
  if (!/^[A-Z]{1}$/.test(section)) {
    throw new BadRequestException('section must be a single alphabet letter (A-Z)');
  }
}

function requireSlots(dto: { slots?: any[] }) {
  if (!dto.slots || !Array.isArray(dto.slots) || dto.slots.length === 0) {
    throw new BadRequestException('slots are required');
  }
}

@Injectable()
export class TimetablesService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepo: Repository<TeacherProfile>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,

    @InjectRepository(TeacherTimetable)
    private readonly teacherTTRepo: Repository<TeacherTimetable>,
    @InjectRepository(TeacherTimetableSlot)
    private readonly teacherSlotRepo: Repository<TeacherTimetableSlot>,

    @InjectRepository(StudentTimetable)
    private readonly studentTTRepo: Repository<StudentTimetable>,
    @InjectRepository(StudentTimetableSlot)
    private readonly studentSlotRepo: Repository<StudentTimetableSlot>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) {
      throw new ForbiddenException('Only principal can manage timetables');
    }
  }

  // =========================================================
  // Teacher Timetable (Principal CRUD)
  // =========================================================

  async upsertTeacherTimetable(
    current: RequestUser,
    dto: CreateTeacherTimetableDto | UpdateTeacherTimetableDto,
  ) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    if (!dto.teacherUserId) throw new BadRequestException('teacherUserId is required');

    requireSlots(dto);
    const slots = dto.slots!; // ✅ now TS knows it's not undefined

    // Validate target teacher exists in this school
    const teacherUser = await this.userRepo.findOne({
      where: { id: dto.teacherUserId, schoolId, role: Role.TEACHER, isActive: true },
      select: ['id', 'role', 'schoolId'],
    });
    if (!teacherUser) throw new NotFoundException('Teacher not found in this school');

    // Validate each assignedTeacherUserId belongs to school + role TEACHER
    const assignedIds = Array.from(new Set(slots.map((s: any) => s.assignedTeacherUserId)));
    if (assignedIds.length) {
      const found = await this.userRepo.count({
        where: { schoolId, role: Role.TEACHER, isActive: true },
      });
      if (found === 0) throw new BadRequestException('No teachers available in school');

      for (const id of assignedIds) {
        const ok = await this.userRepo.exist({
          where: { id, schoolId, role: Role.TEACHER, isActive: true },
        });
        if (!ok) throw new BadRequestException(`assignedTeacherUserId is invalid: ${id}`);
      }
    }

    // Validate slots (section)
    for (const s of slots) {
      const sec = normalizeSection((s as any).section);
      if (sec) assertSingleLetterSectionOrNull(sec);
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      let tt = await qr.manager.getRepository(TeacherTimetable).findOne({
        where: { schoolId, teacherUserId: dto.teacherUserId },
      });

      if (!tt) {
        tt = qr.manager.getRepository(TeacherTimetable).create({
          schoolId,
          teacherUserId: dto.teacherUserId,
          createdBy: current.userId,
          isActive: true,
        });
        tt = await qr.manager.getRepository(TeacherTimetable).save(tt);
      } else {
        tt.isActive = true;
        tt.createdBy = tt.createdBy ?? current.userId;
        tt = await qr.manager.getRepository(TeacherTimetable).save(tt);
      }

      // Replace slots
      await qr.manager.getRepository(TeacherTimetableSlot).delete({ timetableId: tt.id });

      const slotsToSave = slots.map((s: any) =>
        qr.manager.getRepository(TeacherTimetableSlot).create({
          timetableId: tt!.id,
          dayOfWeek: s.dayOfWeek,
          timing: String(s.timing).trim(),
          classNumber: s.classNumber,
          section: normalizeSection(s.section),
          subject: String(s.subject).trim(),
          assignedTeacherUserId: s.assignedTeacherUserId,
          sortOrder: s.sortOrder ?? 0,
          isActive: true,
        }),
      );

      await qr.manager.getRepository(TeacherTimetableSlot).save(slotsToSave);

      await qr.commitTransaction();
      return this.getTeacherTimetableByTeacherUserId(current, dto.teacherUserId);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async listTeacherTimetables(current: RequestUser) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const teachers = await this.teacherProfileRepo.find({
      where: { schoolId },
      relations: ['user'],
      order: { fullName: 'ASC' },
    });

    const teacherUserIds = teachers.map((t) => t.userId);
    const timetables = teacherUserIds.length
      ? await this.teacherTTRepo.find({
          where: teacherUserIds.map((id) => ({ schoolId, teacherUserId: id })),
        })
      : [];

    const timetableByTeacher = new Map<string, TeacherTimetable>();
    timetables.forEach((t) => timetableByTeacher.set(t.teacherUserId, t));

    const ttIds = timetables.map((t) => t.id);
    const slots = ttIds.length
      ? await this.teacherSlotRepo.find({
          where: ttIds.map((id) => ({ timetableId: id })),
          order: { dayOfWeek: 'ASC', sortOrder: 'ASC' },
        })
      : [];

    const slotsByTT = new Map<string, TeacherTimetableSlot[]>();
    for (const s of slots) {
      const arr = slotsByTT.get(s.timetableId) ?? [];
      arr.push(s);
      slotsByTT.set(s.timetableId, arr);
    }

    return teachers.map((t) => {
      const tt = timetableByTeacher.get(t.userId);
      const ttSlots = tt ? slotsByTT.get(tt.id) ?? [] : [];

      return {
        teacher: {
          userId: t.userId,
          teacherProfileId: t.id,
          teacherId: t.teacherId,
          fullName: t.fullName,
          profilePhotoUrl: t.profilePhotoUrl,
          isClassTeacher: !!t.classTeacherClass,
          classTeacher: t.classTeacherClass
            ? { classNumber: t.classTeacherClass, section: t.classTeacherSection }
            : null,
          subjectsHandled: t.subjectTeacher ?? null,
        },
        timetable: tt
          ? {
              id: tt.id,
              isActive: tt.isActive,
              updatedAt: tt.updatedAt,
              slots: ttSlots.map((s) => ({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                timing: s.timing,
                classNumber: s.classNumber,
                section: s.section,
                subject: s.subject,
                assignedTeacherUserId: s.assignedTeacherUserId,
                sortOrder: s.sortOrder,
              })),
            }
          : null,
      };
    });
  }

  async getTeacherTimetableByTeacherUserId(current: RequestUser, teacherUserId: string) {
    const { schoolId } = this.assertSchoolScope(current);
    if (current.role !== Role.PRINCIPAL && current.userId !== teacherUserId) {
      throw new ForbiddenException('Access denied');
    }

    const tt = await this.teacherTTRepo.findOne({ where: { schoolId, teacherUserId } });
    if (!tt) throw new NotFoundException('Teacher timetable not found');

    const slots = await this.teacherSlotRepo.find({
      where: { timetableId: tt.id },
      order: { dayOfWeek: 'ASC', sortOrder: 'ASC' },
    });

    return {
      id: tt.id,
      teacherUserId: tt.teacherUserId,
      isActive: tt.isActive,
      createdBy: tt.createdBy,
      createdAt: tt.createdAt,
      updatedAt: tt.updatedAt,
      slots: slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        timing: s.timing,
        classNumber: s.classNumber,
        section: s.section,
        subject: s.subject,
        assignedTeacherUserId: s.assignedTeacherUserId,
        sortOrder: s.sortOrder,
      })),
    };
  }

  async getMyTeacherTimetable(current: RequestUser) {
    if (current.role !== Role.TEACHER) throw new ForbiddenException('Only teachers can access this');
    return this.getTeacherTimetableByTeacherUserId(current, current.userId);
  }

  async deleteTeacherTimetable(current: RequestUser, teacherUserId: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const tt = await this.teacherTTRepo.findOne({ where: { schoolId, teacherUserId } });
    if (!tt) throw new NotFoundException('Teacher timetable not found');

    await this.teacherTTRepo.remove(tt);
    return { message: 'Deleted' };
  }

  // =========================================================
  // Student Timetable (Principal CRUD)
  // =========================================================

  async upsertStudentTimetable(
    current: RequestUser,
    dto: CreateStudentTimetableDto | UpdateStudentTimetableDto,
  ) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    if (dto.classNumber === undefined || dto.classNumber === null) {
      throw new BadRequestException('classNumber is required');
    }

    requireSlots(dto);
    const slots = dto.slots!; // ✅ now TS knows it's not undefined

    const section = normalizeSection(dto.section ?? null);
    assertSingleLetterSectionOrNull(section);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      const where: any = {
        schoolId,
        classNumber: dto.classNumber,
        section: section ?? IsNull(),
      };

      let tt = await qr.manager.getRepository(StudentTimetable).findOne({ where });

      if (!tt) {
        tt = qr.manager.getRepository(StudentTimetable).create({
          schoolId,
          classNumber: dto.classNumber,
          section,
          createdBy: current.userId,
          isActive: true,
        });
        tt = await qr.manager.getRepository(StudentTimetable).save(tt);
      } else {
        tt.isActive = true;
        tt = await qr.manager.getRepository(StudentTimetable).save(tt);
      }

      await qr.manager.getRepository(StudentTimetableSlot).delete({ timetableId: tt.id });

      const slotsToSave = slots.map((s: any) =>
        qr.manager.getRepository(StudentTimetableSlot).create({
          timetableId: tt!.id,
          dayOfWeek: s.dayOfWeek,
          timing: String(s.timing).trim(),
          subject: String(s.subject).trim(),
          sortOrder: s.sortOrder ?? 0,
          isActive: true,
        }),
      );

      await qr.manager.getRepository(StudentTimetableSlot).save(slotsToSave);

      await qr.commitTransaction();
      return this.getStudentTimetableByClass(current, dto.classNumber, section);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async listStudentTimetables(current: RequestUser) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const tts = await this.studentTTRepo.find({
      where: { schoolId },
      order: { classNumber: 'ASC', section: 'ASC' },
    });

    const ids = tts.map((t) => t.id);
    const slots = ids.length
      ? await this.studentSlotRepo.find({
          where: ids.map((id) => ({ timetableId: id })),
          order: { dayOfWeek: 'ASC', sortOrder: 'ASC' },
        })
      : [];

    const slotsBy = new Map<string, StudentTimetableSlot[]>();
    for (const s of slots) {
      const arr = slotsBy.get(s.timetableId) ?? [];
      arr.push(s);
      slotsBy.set(s.timetableId, arr);
    }

    return tts.map((t) => ({
      id: t.id,
      classNumber: t.classNumber,
      section: t.section,
      isActive: t.isActive,
      updatedAt: t.updatedAt,
      slots: (slotsBy.get(t.id) ?? []).map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        timing: s.timing,
        subject: s.subject,
        sortOrder: s.sortOrder,
      })),
    }));
  }

  async getStudentTimetableByClass(
    current: RequestUser,
    classNumber: number,
    section: string | null,
  ) {
    const { schoolId } = this.assertSchoolScope(current);

    const tt = await this.studentTTRepo.findOne({
      where: {
        schoolId,
        classNumber,
        section: section ?? IsNull(),
      } as any,
    });

    if (!tt) throw new NotFoundException('Student timetable not found');

    const slots = await this.studentSlotRepo.find({
      where: { timetableId: tt.id },
      order: { dayOfWeek: 'ASC', sortOrder: 'ASC' },
    });

    return {
      id: tt.id,
      classNumber: tt.classNumber,
      section: tt.section,
      isActive: tt.isActive,
      createdBy: tt.createdBy,
      createdAt: tt.createdAt,
      updatedAt: tt.updatedAt,
      slots: slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        timing: s.timing,
        subject: s.subject,
        sortOrder: s.sortOrder,
      })),
    };
  }

  async getMyStudentTimetable(current: RequestUser) {
    if (current.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can access this');
    }

    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.studentProfileRepo.findOne({
      where: { schoolId, userId: current.userId },
    });

    if (!profile) throw new NotFoundException('Student profile not found');

    const sec = normalizeSection(profile.section);
    return this.getStudentTimetableByClass(current, profile.classNumber, sec);
  }

  async deleteStudentTimetable(current: RequestUser, classNumber: number, section: string | null) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const tt = await this.studentTTRepo.findOne({
      where: {
        schoolId,
        classNumber,
        section: section ?? IsNull(),
      } as any,
    });

    if (!tt) throw new NotFoundException('Student timetable not found');

    await this.studentTTRepo.remove(tt);
    return { message: 'Deleted' };
  }
}
