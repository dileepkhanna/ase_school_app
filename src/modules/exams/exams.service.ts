import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { Exam } from './entities/exam.entity';
import { ExamSchedule } from './entities/exam-schedule.entity';
import { ExamMarks } from './entities/exam-marks.entity';
import { ExamResult } from './entities/exam-result.entity';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { TeacherSubject } from '../teachers/entities/teacher-subject.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateExamDto } from './dto/create-exam.dto';
import { AddExamScheduleDto } from './dto/add-exam-schedule.dto';
import { EnterMarksDto } from './dto/enter-marks.dto';
import { PublishResultDto } from './dto/publish-result.dto';
import { ExamListQueryDto } from './dto/exam-list.query.dto';

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

function between(date: Date, from: Date, to: Date): boolean {
  return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

type GradeScale = Array<{ grade: string; minPct: number; maxPct: number }>;
const DEFAULT_GRADE_SCALE: GradeScale = [
  { grade: 'A+', minPct: 90, maxPct: 100 },
  { grade: 'A', minPct: 80, maxPct: 89.99 },
  { grade: 'B', minPct: 70, maxPct: 79.99 },
  { grade: 'C', minPct: 60, maxPct: 69.99 },
  { grade: 'D', minPct: 50, maxPct: 59.99 },
  { grade: 'F', minPct: 0, maxPct: 49.99 },
];

function gradeForPct(pct: number, scale: GradeScale = DEFAULT_GRADE_SCALE): string {
  for (const g of scale) {
    if (pct >= g.minPct && pct <= g.maxPct) return g.grade;
  }
  return 'F';
}

function passFail(grade: string): 'PASS' | 'FAIL' {
  return grade === 'F' ? 'FAIL' : 'PASS';
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,

    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamSchedule) private readonly scheduleRepo: Repository<ExamSchedule>,
    @InjectRepository(ExamMarks) private readonly marksRepo: Repository<ExamMarks>,
    @InjectRepository(ExamResult) private readonly resultRepo: Repository<ExamResult>,

    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(TeacherSubject) private readonly teacherSubjectRepo: Repository<TeacherSubject>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can do this');
  }

  private assertTeacher(user: RequestUser) {
    if (user.role !== Role.TEACHER) throw new ForbiddenException('Only teacher can do this');
  }

  // =========================================================
  // Principal: Create exam
  // =========================================================
  async createExam(current: RequestUser, dto: CreateExamDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const start = parseDateOnlyOrFail(dto.startDate);
    const end = parseDateOnlyOrFail(dto.endDate);
    if (start.getTime() > end.getTime()) throw new BadRequestException('startDate cannot be after endDate');

    const classSections = dto.classSections.map((cs) => ({
      classNumber: cs.classNumber,
      section: normalizeSection(cs.section ?? null),
    }));

    if (!classSections.length) throw new BadRequestException('classSections cannot be empty');

    const row = this.examRepo.create({
      schoolId,
      examName: dto.examName.trim(),
      academicYear: dto.academicYear.trim(),
      startDate: start,
      endDate: end,
      applicableClassSections: classSections,
      createdByPrincipalUserId: current.userId,
      isActive: true,
    });

    const saved = await this.examRepo.save(row);
    return this.mapExam(saved);
  }

  // =========================================================
  // Principal: list exams
  // =========================================================
  async listExamsPrincipal(current: RequestUser, q: ExamListQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.examRepo
      .createQueryBuilder('e')
      .where('e.school_id = :schoolId', { schoolId })
      .andWhere('e.is_active = true')
      .orderBy('e.created_at', 'DESC')
      .skip(q.skip)
      .take(q.take);

    if (q.academicYear) qb.andWhere('e.academic_year = :ay', { ay: q.academicYear.trim() });

    if (q.search) {
      const s = q.search.trim();
      qb.andWhere('e.exam_name ILIKE :q', { q: `%${s}%` });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map((e) => this.mapExam(e)), total, page: q.page ?? 1, limit: q.take };
  }

  // =========================================================
  // Principal: Add schedule items
  // =========================================================
  async addSchedules(current: RequestUser, dto: AddExamScheduleDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const exam = await this.examRepo.findOne({ where: { id: dto.examId, schoolId, isActive: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    if (!dto.items?.length) throw new BadRequestException('items cannot be empty');

    const allowed = new Set(
      exam.applicableClassSections.map((x) => `${x.classNumber}::${normalizeSection(x.section) ?? ''}`),
    );

    const rows = dto.items.map((it) => {
      const section = normalizeSection(it.section ?? null);
      const examDate = parseDateOnlyOrFail(it.examDate);

      const key = `${it.classNumber}::${section ?? ''}`;
      if (!allowed.has(key)) {
        throw new BadRequestException(`Class/Section ${it.classNumber}${section ?? ''} is not part of this exam`);
      }
      if (!between(examDate, exam.startDate, exam.endDate)) {
        throw new BadRequestException(`examDate ${it.examDate} must be within exam start/end dates`);
      }

      return this.scheduleRepo.create({
        schoolId,
        examId: exam.id,
        classNumber: it.classNumber,
        section,
        subject: it.subject.trim(),
        examDate,
        timing: it.timing.trim(),
        createdByPrincipalUserId: current.userId,
      });
    });

    // Save; unique constraints handle duplicates
    await this.scheduleRepo.save(rows);
    return { message: 'Schedules saved', count: rows.length };
  }

  // =========================================================
  // Student: my schedule for a given exam OR all upcoming
  // =========================================================
  async getMyScheduleStudent(current: RequestUser, params: { examId?: string }) {
    if (current.role !== Role.STUDENT) throw new ForbiddenException('Only students can access this');
    const { schoolId } = this.assertSchoolScope(current);

    const me = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } as any });
    if (!me) throw new NotFoundException('Student profile not found');

    const sec = normalizeSection((me as any).section);

    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .innerJoin(Exam, 'e', 'e.id = s.exam_id')
      .where('s.school_id = :schoolId', { schoolId })
      .andWhere('s.class_number = :c', { c: (me as any).classNumber })
      .andWhere(sec === null ? 's.section IS NULL' : 's.section = :sec', sec === null ? {} : { sec })
      .andWhere('e.is_active = true');

    if (params.examId) qb.andWhere('s.exam_id = :eid', { eid: params.examId });

    qb.orderBy('s.exam_date', 'ASC');

    const rows = await qb.getMany();
    return rows.map((s) => this.mapSchedule(s));
  }

  // =========================================================
  // Teacher: schedules (for visibility)
  // For now:
  //  - Class teacher sees schedules for their class/section
  //  - Otherwise, teacher sees schedules matching their subject list (best-effort)
  // =========================================================
  async getMySchedulesTeacher(current: RequestUser, params: { examId?: string }) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.teacherRepo.findOne({ where: { schoolId, userId: current.userId } });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    const classTeacherClass = (profile as any).classTeacherClass as number | null | undefined;
    const classTeacherSection = normalizeSection((profile as any).classTeacherSection);

    const teacherSubjects = await this.teacherSubjectRepo.find({
      where: { schoolId, teacherUserId: current.userId } as any,
    });

    const subjectSet = new Set(
      teacherSubjects.map((x) => String((x as any).subject ?? '').trim().toLowerCase()).filter(Boolean),
    );

    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .innerJoin(Exam, 'e', 'e.id = s.exam_id')
      .where('s.school_id = :schoolId', { schoolId })
      .andWhere('e.is_active = true');

    if (params.examId) qb.andWhere('s.exam_id = :eid', { eid: params.examId });

    if (classTeacherClass) {
      qb.andWhere('s.class_number = :c', { c: classTeacherClass });
      qb.andWhere(
        classTeacherSection === null ? 's.section IS NULL' : 's.section = :sec',
        classTeacherSection === null ? {} : { sec: classTeacherSection },
      );
    } else if (subjectSet.size) {
      // best-effort subject-wise visibility (without class mapping)
      qb.andWhere(
        new Brackets((b) => {
          for (const sub of subjectSet) {
            b.orWhere('LOWER(s.subject) = :sub_' + sub.replace(/[^a-z0-9]/g, ''), {
              ['sub_' + sub.replace(/[^a-z0-9]/g, '')]: sub,
            });
          }
        }),
      );
    } else {
      // no class teacher + no subject mapping => nothing
      return [];
    }

    qb.orderBy('s.exam_date', 'ASC');
    const rows = await qb.getMany();
    return rows.map((s) => this.mapSchedule(s));
  }

  // =========================================================
  // Teacher: enter marks (draft)
  // Enforced rule (strict):
  //  - Must be class teacher of that schedule class/section
  // =========================================================
  async enterMarks(current: RequestUser, dto: EnterMarksDto) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const exam = await this.examRepo.findOne({ where: { id: dto.examId, schoolId, isActive: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    const schedule = await this.scheduleRepo.findOne({ where: { id: dto.scheduleId, schoolId, examId: exam.id } });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const profile = await this.teacherRepo.findOne({ where: { schoolId, userId: current.userId } });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    const ctClass = (profile as any).classTeacherClass as number | null | undefined;
    const ctSec = normalizeSection((profile as any).classTeacherSection);

    // STRICT as per your security + "assigned class" rule
    if (!ctClass) throw new ForbiddenException('Only class teacher can enter marks');
    if (schedule.classNumber !== ctClass) throw new ForbiddenException('You can enter marks only for your class');
    if ((normalizeSection(schedule.section) ?? null) !== (ctSec ?? null)) throw new ForbiddenException('You can enter marks only for your section');

    if (!dto.rows?.length) throw new BadRequestException('rows cannot be empty');

    // Validate students belong to this class/section
    const students = await this.studentRepo.find({
      where: { schoolId, classNumber: schedule.classNumber, section: schedule.section } as any,
      order: { rollNumber: 'ASC' as any },
    });

    const studentById = new Map<string, StudentProfile>();
    for (const s of students) studentById.set((s as any).id, s);

    for (const r of dto.rows) {
      if (!studentById.has(r.studentProfileId)) {
        throw new BadRequestException('Invalid studentProfileId for this class/section: ' + r.studentProfileId);
      }
      if (r.marksObtained > r.maxMarks) throw new BadRequestException('marksObtained cannot exceed maxMarks');
    }

    // Upsert marks rows
    const toSave: ExamMarks[] = dto.rows.map((r) =>
      this.marksRepo.create({
        schoolId,
        examId: exam.id,
        scheduleId: schedule.id,
        studentProfileId: r.studentProfileId,
        classNumber: schedule.classNumber,
        section: schedule.section,
        subject: schedule.subject,
        enteredByTeacherUserId: current.userId,
        marksObtained: r.marksObtained.toFixed(2),
        maxMarks: r.maxMarks.toFixed(2),
      }),
    );

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();

      // Save each row with conflict handling by deleting existing rows for those students+schedule (simple & safe)
      const ids = dto.rows.map((x) => x.studentProfileId);
      await qr.manager
        .getRepository(ExamMarks)
        .delete({ schoolId, examId: exam.id, scheduleId: schedule.id, studentProfileId: In(ids) } as any);

      await qr.manager.getRepository(ExamMarks).save(toSave);

      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    return { message: 'Marks saved (draft)', count: toSave.length };
  }

  // =========================================================
  // Teacher: publish result for class/section
  // Creates/updates ExamResult rows (isPublished=true)
  // Sends push to only that class/section students
  // =========================================================
  async publishResult(current: RequestUser, dto: PublishResultDto) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const exam = await this.examRepo.findOne({ where: { id: dto.examId, schoolId, isActive: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    const section = normalizeSection(dto.section ?? null);

    // Must be class teacher of that class/section
    const profile = await this.teacherRepo.findOne({ where: { schoolId, userId: current.userId } });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    const ctClass = (profile as any).classTeacherClass as number | null | undefined;
    const ctSec = normalizeSection((profile as any).classTeacherSection);

    if (!ctClass) throw new ForbiddenException('Only class teacher can publish results');
    if (dto.classNumber !== ctClass) throw new ForbiddenException('You can publish only for your class');
    if ((ctSec ?? null) !== (section ?? null)) throw new ForbiddenException('You can publish only for your section');

    // Fetch students in that class/section
    const students = await this.studentRepo.find({
      where: { schoolId, classNumber: dto.classNumber, section } as any,
      order: { rollNumber: 'ASC' as any },
    });

    if (!students.length) throw new NotFoundException('No students found for this class/section');

    const studentIds = students.map((s) => (s as any).id);

    // Fetch schedules of this exam for the class/section
    const schedules = await this.scheduleRepo.find({
      where: { schoolId, examId: exam.id, classNumber: dto.classNumber, section } as any,
      order: { examDate: 'ASC' as any },
    });

    if (!schedules.length) throw new BadRequestException('No exam schedules found for this class/section');

    const scheduleIds = schedules.map((s) => s.id);

    // Fetch marks
    const marks = await this.marksRepo.find({
      where: { schoolId, examId: exam.id, scheduleId: In(scheduleIds), studentProfileId: In(studentIds) } as any,
    });

    // Build marks per student per schedule
    const marksByStudent = new Map<string, ExamMarks[]>();
    for (const m of marks) {
      const arr = marksByStudent.get(m.studentProfileId) ?? [];
      arr.push(m);
      marksByStudent.set(m.studentProfileId, arr);
    }

    // Ensure each student has marks for each schedule before publish (strict)
    for (const sid of studentIds) {
      const arr = marksByStudent.get(sid) ?? [];
      const set = new Set(arr.map((x) => x.scheduleId));
      if (set.size !== scheduleIds.length) {
        throw new BadRequestException('Cannot publish: marks entry incomplete for some students/subjects');
      }
    }

    const now = new Date();

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();

      // Upsert results
      for (const st of students) {
        const sid = (st as any).id as string;
        const arr = marksByStudent.get(sid)!;

        let totalObt = 0;
        let totalMax = 0;

        const breakdown = arr
          .map((m) => {
            const obt = Number(m.marksObtained);
            const mx = Number(m.maxMarks);
            totalObt += obt;
            totalMax += mx;
            return { subject: m.subject, obtained: obt, max: mx, scheduleId: m.scheduleId };
          })
          .sort((a, b) => a.subject.localeCompare(b.subject));

        const pct = totalMax === 0 ? 0 : (totalObt / totalMax) * 100;
        const grade = gradeForPct(Number(pct.toFixed(2)));
        const status = passFail(grade);

        let resRow = await qr.manager.getRepository(ExamResult).findOne({
          where: { schoolId, examId: exam.id, studentProfileId: sid } as any,
        });

        if (!resRow) {
          resRow = qr.manager.getRepository(ExamResult).create({
            schoolId,
            examId: exam.id,
            studentProfileId: sid,
            classNumber: dto.classNumber,
            section,
            totalObtained: totalObt.toFixed(2),
            totalMax: totalMax.toFixed(2),
            percentage: pct.toFixed(2),
            grade,
            resultStatus: status,
            isPublished: true,
            publishedByTeacherUserId: current.userId,
            publishedAt: now,
            subjectBreakdown: breakdown,
          });
        } else {
          resRow.classNumber = dto.classNumber;
          resRow.section = section;
          resRow.totalObtained = totalObt.toFixed(2);
          resRow.totalMax = totalMax.toFixed(2);
          resRow.percentage = pct.toFixed(2);
          resRow.grade = grade;
          resRow.resultStatus = status;
          resRow.isPublished = true;
          resRow.publishedByTeacherUserId = current.userId;
          resRow.publishedAt = now;
          resRow.subjectBreakdown = breakdown;
        }

        await qr.manager.getRepository(ExamResult).save(resRow);
      }

      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    // Notify students (only that class/section) – best effort
    await Promise.all(
      students.map(async (st) => {
        const studentUserId = (st as any).userId as string | undefined;
        if (!studentUserId) return;

        try {
          await this.notifications.createForUser({
            schoolId,
            userId: studentUserId,
            title: 'Exam Result Published',
            body: `Your exam results are published. Please check.`,
            imageUrl: null,
            data: {
              type: 'EXAM_RESULT',
              examId: exam.id,
              classNumber: dto.classNumber,
              section: section,
            },
            push: true,
          });
        } catch {
          // ignore
        }
      }),
    );

    return { message: 'Results published', examId: exam.id, classNumber: dto.classNumber, section };
  }

  // =========================================================
  // Student: view result (published only)
  // =========================================================
  async getMyResult(current: RequestUser, params: { examId: string }) {
    if (current.role !== Role.STUDENT) throw new ForbiddenException('Only students can access this');
    const { schoolId } = this.assertSchoolScope(current);

    const me = await this.studentRepo.findOne({ where: { schoolId, userId: current.userId } as any });
    if (!me) throw new NotFoundException('Student profile not found');

    const res = await this.resultRepo.findOne({
      where: {
        schoolId,
        examId: params.examId,
        studentProfileId: (me as any).id,
        isPublished: true,
      } as any,
    });

    if (!res) throw new NotFoundException('Result not published');

    return {
      examId: res.examId,
      studentProfileId: res.studentProfileId,
      classNumber: res.classNumber,
      section: res.section,
      totalObtained: Number(res.totalObtained),
      totalMax: Number(res.totalMax),
      percentage: Number(res.percentage),
      grade: res.grade,
      resultStatus: res.resultStatus,
      publishedAt: res.publishedAt,
      subjects: (res.subjectBreakdown ?? []).map((x) => ({
        subject: x.subject,
        obtained: x.obtained,
        max: x.max,
      })),
    };
  }

  // =========================================================
  // Principal: monitor status for class/section (read-only)
  // =========================================================
  async principalClassStatus(current: RequestUser, params: { examId: string; classNumber: number; section?: string }) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const exam = await this.examRepo.findOne({ where: { id: params.examId, schoolId, isActive: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    const section = normalizeSection(params.section ?? null);

    const schedules = await this.scheduleRepo.find({
      where: { schoolId, examId: exam.id, classNumber: params.classNumber, section } as any,
      order: { examDate: 'ASC' as any },
    });

    const students = await this.studentRepo.find({
      where: { schoolId, classNumber: params.classNumber, section } as any,
    });

    const publishedCount = await this.resultRepo.count({
      where: { schoolId, examId: exam.id, classNumber: params.classNumber, section, isPublished: true } as any,
    });

    // marks entry progress: count marks rows vs expected = students * schedules
    const marksCount = schedules.length && students.length
      ? await this.marksRepo.count({
          where: {
            schoolId,
            examId: exam.id,
            classNumber: params.classNumber,
            section,
          } as any,
        })
      : 0;

    const expectedMarks = students.length * schedules.length;
    const status =
      publishedCount > 0
        ? 'COMPLETED'
        : marksCount > 0
          ? 'IN_PROGRESS'
          : 'NOT_STARTED';

    return {
      exam: this.mapExam(exam),
      classNumber: params.classNumber,
      section,
      schedules: schedules.map((s) => this.mapSchedule(s)),
      studentsCount: students.length,
      expectedMarks,
      marksCount,
      publishedCount,
      status,
    };
  }

  // =========================================================
  // Principal: get schedules for exam (for review)
  // =========================================================
  async principalExamSchedules(current: RequestUser, examId: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const exam = await this.examRepo.findOne({ where: { id: examId, schoolId, isActive: true } });
    if (!exam) throw new NotFoundException('Exam not found');

    const schedules = await this.scheduleRepo.find({
      where: { schoolId, examId: exam.id } as any,
      order: { examDate: 'ASC' as any },
    });

    return { exam: this.mapExam(exam), schedules: schedules.map((s) => this.mapSchedule(s)) };
  }

  private mapExam(e: Exam) {
    return {
      id: e.id,
      examName: e.examName,
      academicYear: e.academicYear,
      startDate: toDateStr(e.startDate),
      endDate: toDateStr(e.endDate),
      applicableClassSections: e.applicableClassSections,
      createdAt: e.createdAt,
    };
  }

  private mapSchedule(s: ExamSchedule) {
    return {
      id: s.id,
      examId: s.examId,
      classNumber: s.classNumber,
      section: s.section,
      subject: s.subject,
      examDate: toDateStr(s.examDate),
      timing: s.timing,
    };
  }
}
