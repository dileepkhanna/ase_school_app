import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';

import { AttendanceStatus } from '../../common/enums/attendance.enum';
import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { StudentAttendance } from './entities/student-attendance.entity';
import { TeacherAttendance } from './entities/teacher-attendance.entity';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceFilterQueryDto } from './dto/attendance-filter.query.dto';
import { ExportAttendanceQueryDto } from './dto/export-attendance.query.dto';

import { NotificationsService } from '../notifications/notifications.service';

function normalizeSection(section?: string | null): string | null {
  if (section === undefined || section === null) return null;
  const s = String(section).trim().toUpperCase();
  return s.length ? s : null;
}

function parseDateOnlyOrFail(v: string): Date {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException('date must be YYYY-MM-DD');
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeFinalStatus(
  morning: AttendanceStatus | null,
  afternoon: AttendanceStatus | null,
): AttendanceStatus | null {
  // If one session missing, keep provisional to show something in calendar.
  if (morning && !afternoon) return morning;
  if (!morning && afternoon) return afternoon;
  if (!morning && !afternoon) return null;

  // Both available => compute final
  if (morning === AttendanceStatus.P && afternoon === AttendanceStatus.P) return AttendanceStatus.P;
  if (morning === AttendanceStatus.A && afternoon === AttendanceStatus.A) return AttendanceStatus.A;

  return AttendanceStatus.H; // half day if mixed
}

function monthRange(year: number, month: number): { from: Date; to: Date } {
  // month: 1..12
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day
  return { from, to };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,

    @InjectRepository(StudentAttendance)
    private readonly studentAttendanceRepo: Repository<StudentAttendance>,

    @InjectRepository(TeacherAttendance)
    private readonly teacherAttendanceRepo: Repository<TeacherAttendance>,

    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepo: Repository<TeacherProfile>,

    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertTeacher(user: RequestUser) {
    if (user.role !== Role.TEACHER) throw new ForbiddenException('Only teacher can perform this');
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can perform this');
  }

  // =========================================================
  // Teacher: Mark attendance (MORNING / AFTERNOON) + SUBMIT
  // (We treat this endpoint as the "submit" for that session)
  // =========================================================
  async markStudentAttendance(current: RequestUser, dto: MarkAttendanceDto) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const section = normalizeSection(dto.section ?? null);
    if (section && !/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('section must be a single alphabet letter (A-Z)');
    }

    const date = parseDateOnlyOrFail(dto.date);

    // Security rule: teacher can mark only for their class teacher class/section
    const tProfile = await this.teacherProfileRepo.findOne({
      where: { schoolId, userId: current.userId },
    });
    if (!tProfile) throw new ForbiddenException('Teacher profile not found');

    if (!tProfile.classTeacherClass) {
      throw new ForbiddenException('Only class teacher can mark student attendance');
    }
    const mySection = normalizeSection(tProfile.classTeacherSection);
    if (dto.classNumber !== tProfile.classTeacherClass) {
      throw new ForbiddenException('You can mark attendance only for your class');
    }
    if ((mySection ?? null) !== (section ?? null)) {
      throw new ForbiddenException('You can mark attendance only for your section');
    }

    const studentIds = Array.from(new Set(dto.rows.map((r) => r.studentProfileId)));
    if (!studentIds.length) throw new BadRequestException('rows cannot be empty');

    // Validate students belong to this class/section and are active
    const students = await this.studentProfileRepo.find({
      where: { schoolId, classNumber: dto.classNumber, section: section ?? IsNull() },
      order: { rollNumber: 'ASC' as any },
    });

    const studentById = new Map<string, StudentProfile>();
    for (const s of students) studentById.set(s.id, s);

    for (const id of studentIds) {
      if (!studentById.has(id)) {
        throw new BadRequestException('Invalid studentProfileId for this class/section: ' + id);
      }
    }

    // Load existing attendance rows for these students for the date
    const existing = await this.studentAttendanceRepo.find({
      where: studentIds.map((id) => ({
        schoolId,
        studentProfileId: id,
        date,
      })),
    });

    const existingByStudent = new Map<string, StudentAttendance>();
    for (const e of existing) existingByStudent.set(e.studentProfileId, e);

    const now = new Date();

    // Prepare updates
    const toSave: StudentAttendance[] = [];
    for (const row of dto.rows) {
      const st = studentById.get(row.studentProfileId)!;
      const status = row.status === 'P' ? AttendanceStatus.P : AttendanceStatus.A;

      let rec = existingByStudent.get(row.studentProfileId);
      if (!rec) {
        rec = this.studentAttendanceRepo.create({
          schoolId,
          studentProfileId: st.id,
          classNumber: dto.classNumber,
          section: section,
          date,
          morningStatus: null,
          afternoonStatus: null,
          finalStatus: null,
          markedByTeacherUserIdMorning: null,
          markedByTeacherUserIdAfternoon: null,
          submittedAtMorning: null,
          submittedAtAfternoon: null,
        });
      }

      if (dto.session === 'MORNING') {
        rec.morningStatus = status;
        rec.markedByTeacherUserIdMorning = current.userId;
        rec.submittedAtMorning = now;
      } else {
        rec.afternoonStatus = status;
        rec.markedByTeacherUserIdAfternoon = current.userId;
        rec.submittedAtAfternoon = now;
      }

      rec.finalStatus = computeFinalStatus(rec.morningStatus, rec.afternoonStatus);
      toSave.push(rec);
    }

    // Transaction save
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();
      await qr.manager.getRepository(StudentAttendance).save(toSave);
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    // After commit => notify only ABSENT students for this session
    const absentStudents = dto.rows
      .filter((r) => r.status === 'A')
      .map((r) => studentById.get(r.studentProfileId)!)
      .filter(Boolean);

    const notifPromises = absentStudents.map(async (st) => {
      // student profile must have userId; we assume it exists (from your Student module)
      const studentUserId = (st as any).userId as string | undefined;
      if (!studentUserId) return;

      const sessionLabel = dto.session === 'MORNING' ? 'Morning' : 'Afternoon';
      const title = 'Attendance';
      const body = `Your child ${st.fullName} is absent (${sessionLabel}).`;

      try {
        await this.notifications.createForUser({
          schoolId,
          userId: studentUserId,
          title,
          body,
          imageUrl: null,
          data: {
            type: 'ATTENDANCE',
            date: dto.date,
            session: dto.session,
            classNumber: dto.classNumber,
            section: section,
            studentProfileId: st.id,
          },
          push: true,
        });
      } catch {
        // Best-effort (do not fail attendance submit because push failed)
      }
    });

    await Promise.all(notifPromises);

    const presentCount = dto.rows.filter((r) => r.status === 'P').length;
    const absentCount = dto.rows.filter((r) => r.status === 'A').length;

    return {
      message: 'Attendance submitted',
      date: dto.date,
      session: dto.session,
      classNumber: dto.classNumber,
      section,
      presentCount,
      absentCount,
      total: dto.rows.length,
    };
  }

  // =========================================================
  // Student: My attendance calendar + percentage
  // =========================================================
  async getMyAttendance(current: RequestUser, query: AttendanceFilterQueryDto) {
    if (current.role !== Role.STUDENT) throw new ForbiddenException('Only students can access this');
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.studentProfileRepo.findOne({
      where: { schoolId, userId: current.userId } as any,
    });
    if (!profile) throw new NotFoundException('Student profile not found');

    const { from, to } = this.resolveRange(query);

    const sec = normalizeSection(profile.section);

    const rows = await this.studentAttendanceRepo
      .createQueryBuilder('a')
      .where('a.school_id = :schoolId', { schoolId })
      .andWhere('a.student_profile_id = :spid', { spid: profile.id })
      .andWhere('a.date >= :from AND a.date <= :to', { from, to })
      .orderBy('a.date', 'ASC')
      .getMany();

    const summary = this.computePercentage(rows);

    return {
      student: {
        studentProfileId: profile.id,
        fullName: profile.fullName,
        rollNumber: profile.rollNumber,
        classNumber: profile.classNumber,
        section: sec,
      },
      range: { from: toDateStr(from), to: toDateStr(to) },
      percentage: summary.percentage,
      presentDays: summary.presentDays,
      halfDays: summary.halfDays,
      absentDays: summary.absentDays,
      totalDays: summary.totalDays,
      items: rows.map((r) => ({
        date: toDateStr(r.date),
        morningStatus: r.morningStatus,
        afternoonStatus: r.afternoonStatus,
        finalStatus: r.finalStatus,
      })),
    };
  }

  // =========================================================
  // Principal/Teacher: Student attendance sheet view (month/year)
  // (first 2 columns fixed in UI; API returns dates + rows)
  // =========================================================
  async getClassSheet(current: RequestUser, params: ExportAttendanceQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    // teacher only for their class/section
    if (current.role === Role.TEACHER) {
      const tProfile = await this.teacherProfileRepo.findOne({ where: { schoolId, userId: current.userId } });
      if (!tProfile?.classTeacherClass) throw new ForbiddenException('Only class teacher can access sheet');
      const mySec = normalizeSection(tProfile.classTeacherSection);
      const reqSec = normalizeSection(params.section ?? null);

      if (tProfile.classTeacherClass !== params.classNumber) throw new ForbiddenException('Access denied');
      if ((mySec ?? null) !== (reqSec ?? null)) throw new ForbiddenException('Access denied');
    }

    // principal ok
    if (current.role !== Role.PRINCIPAL && current.role !== Role.TEACHER) {
      throw new ForbiddenException('Access denied');
    }

    const section = normalizeSection(params.section ?? null);
const { from, to } = monthRange(params.year, params.month);

// ✅ TypeORM-safe: if section is null, query "section IS NULL"
const sectionWhere = section === null ? IsNull() : section;

const students = await this.studentProfileRepo.find({
  where: { schoolId, classNumber: params.classNumber, section: sectionWhere },
  order: { rollNumber: 'ASC' as any },
});

    const studentIds = students.map((s) => s.id);
    const attend = studentIds.length
      ? await this.studentAttendanceRepo
          .createQueryBuilder('a')
          .where('a.school_id = :schoolId', { schoolId })
          .andWhere('a.class_number = :c', { c: params.classNumber })
          .andWhere(section === null ? 'a.section IS NULL' : 'a.section = :s', section === null ? {} : { s: section })
          .andWhere('a.date >= :from AND a.date <= :to', { from, to })
          .getMany()
      : [];

    const byStudentDate = new Map<string, Map<string, AttendanceStatus | null>>();
    for (const a of attend) {
      const key = a.studentProfileId;
      const d = toDateStr(a.date);
      const m = byStudentDate.get(key) ?? new Map<string, AttendanceStatus | null>();
      m.set(d, a.finalStatus);
      byStudentDate.set(key, m);
    }

    // Date columns for month
    const dates: string[] = [];
    const cursor = new Date(from.getTime());
    while (cursor.getTime() <= to.getTime()) {
      dates.push(toDateStr(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      classNumber: params.classNumber,
      section,
      month: params.month,
      year: params.year,
      dates,
      rows: students.map((s) => {
        const m = byStudentDate.get(s.id) ?? new Map<string, AttendanceStatus | null>();
        const byDate: Record<string, AttendanceStatus | null> = {};
        for (const d of dates) byDate[d] = m.get(d) ?? null;
        return {
          studentProfileId: s.id,
          rollNumber: s.rollNumber,
          fullName: s.fullName,
          byDate,
        };
      }),
    };
  }

  // =========================================================
  // Export (CSV for now; XLSX later if needed)
  // =========================================================
  async exportClassAttendanceCsv(current: RequestUser, q: ExportAttendanceQueryDto): Promise<string> {
    const sheet = await this.getClassSheet(current, q);

    const header = ['Roll No', 'Name', ...sheet.dates];
    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(','));

    for (const r of sheet.rows) {
      const row = [String(r.rollNumber ?? ''), r.fullName ?? ''];
      for (const d of sheet.dates) {
        const v = r.byDate[d];
        row.push(v ?? '');
      }
      lines.push(row.map(csvEscape).join(','));
    }

    return lines.join('\n');
  }

  // =========================================================
  // Teacher: My attendance calendar + percentage
  // (principal can also query teacher attendance)
  // =========================================================
  async getMyTeacherAttendance(current: RequestUser, query: AttendanceFilterQueryDto) {
    if (current.role !== Role.TEACHER) throw new ForbiddenException('Only teacher can access this');
    const { schoolId } = this.assertSchoolScope(current);

    const { from, to } = this.resolveRange(query);

    const rows = await this.teacherAttendanceRepo
      .createQueryBuilder('t')
      .where('t.school_id = :schoolId', { schoolId })
      .andWhere('t.teacher_user_id = :tid', { tid: current.userId })
      .andWhere('t.date >= :from AND t.date <= :to', { from, to })
      .orderBy('t.date', 'ASC')
      .getMany();

    const summary = this.computeTeacherPercentage(rows);

    return {
      teacherUserId: current.userId,
      range: { from: toDateStr(from), to: toDateStr(to) },
      percentage: summary.percentage,
      presentDays: summary.presentDays,
      halfDays: summary.halfDays,
      absentDays: summary.absentDays,
      totalDays: summary.totalDays,
      items: rows.map((r) => ({
        date: toDateStr(r.date),
        status: r.status,
        source: r.source,
        notes: r.notes,
      })),
    };
  }

  async principalTeacherAttendance(current: RequestUser, query: AttendanceFilterQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    if (!query.teacherUserId) throw new BadRequestException('teacherUserId is required');
    const { from, to } = this.resolveRange(query);

    const rows = await this.teacherAttendanceRepo
      .createQueryBuilder('t')
      .where('t.school_id = :schoolId', { schoolId })
      .andWhere('t.teacher_user_id = :tid', { tid: query.teacherUserId })
      .andWhere('t.date >= :from AND t.date <= :to', { from, to })
      .orderBy('t.date', 'ASC')
      .getMany();

    const summary = this.computeTeacherPercentage(rows);

    return {
      teacherUserId: query.teacherUserId,
      range: { from: toDateStr(from), to: toDateStr(to) },
      percentage: summary.percentage,
      presentDays: summary.presentDays,
      halfDays: summary.halfDays,
      absentDays: summary.absentDays,
      totalDays: summary.totalDays,
      items: rows.map((r) => ({
        date: toDateStr(r.date),
        status: r.status,
        source: r.source,
        notes: r.notes,
      })),
    };
  }

  async setTeacherAttendanceByPrincipal(current: RequestUser, params: { teacherUserId: string; date: string; status: AttendanceStatus; notes?: string | null; }) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const date = parseDateOnlyOrFail(params.date);

    const existing = await this.teacherAttendanceRepo.findOne({
      where: { schoolId, teacherUserId: params.teacherUserId, date },
    });

    if (!existing) {
      const row = this.teacherAttendanceRepo.create({
        schoolId,
        teacherUserId: params.teacherUserId,
        date,
        status: params.status,
        source: 'MANUAL',
        notes: params.notes ?? null,
      });
      await this.teacherAttendanceRepo.save(row);
      return { message: 'Saved' };
    }

    existing.status = params.status;
    existing.source = 'MANUAL';
    existing.notes = params.notes ?? null;
    await this.teacherAttendanceRepo.save(existing);
    return { message: 'Updated' };
  }

  // =========================================================
  // Helpers
  // =========================================================
  private resolveRange(query: AttendanceFilterQueryDto): { from: Date; to: Date } {
    // If month/year provided => use that month
    if (query.month && query.year) return monthRange(query.year, query.month);

    // else use fromDate/toDate if present
    const from = query.fromDate ? parseDateOnlyOrFail(query.fromDate) : new Date(Date.UTC(2000, 0, 1));
    const to = query.toDate ? parseDateOnlyOrFail(query.toDate) : new Date(Date.UTC(2100, 11, 31));
    return { from, to };
  }

  private computePercentage(rows: StudentAttendance[]) {
    let present = 0;
    let half = 0;
    let absent = 0;

    // count only rows that have at least one session marked
    const considered = rows.filter((r) => r.morningStatus !== null || r.afternoonStatus !== null);

    for (const r of considered) {
      if (r.finalStatus === AttendanceStatus.P) present += 1;
      else if (r.finalStatus === AttendanceStatus.H) half += 1;
      else if (r.finalStatus === AttendanceStatus.A) absent += 1;
      else {
        // if finalStatus is null but one session is present -> treat P or A already set by computeFinalStatus
        // computeFinalStatus never returns null when any session exists.
      }
    }

    const total = considered.length;
    const attended = present + half * 0.5;
    const percentage = total === 0 ? 0 : Number(((attended / total) * 100).toFixed(2));

    return {
      totalDays: total,
      presentDays: present,
      halfDays: half,
      absentDays: absent,
      percentage,
    };
  }

  private computeTeacherPercentage(rows: TeacherAttendance[]) {
    let present = 0;
    let half = 0;
    let absent = 0;

    for (const r of rows) {
      if (r.status === AttendanceStatus.P) present += 1;
      else if (r.status === AttendanceStatus.H) half += 1;
      else if (r.status === AttendanceStatus.A) absent += 1;
    }

    const total = rows.length;
    const attended = present + half * 0.5;
    const percentage = total === 0 ? 0 : Number(((attended / total) * 100).toFixed(2));

    return {
      totalDays: total,
      presentDays: present,
      halfDays: half,
      absentDays: absent,
      percentage,
    };
  }
}

function csvEscape(v: string) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
