import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../integrations/redis/redis.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

import { School } from '../modules/schools/entities/school.entity';
import { Exam } from '../modules/exams/entities/exam.entity';
import { ExamSchedule } from '../modules/exams/entities/exam-schedule.entity';

import { StudentProfile } from '../modules/students/entities/student-profile.entity';
import { TeacherProfile } from '../modules/teachers/entities/teacher-profile.entity';

const TZ_IST = 'Asia/Kolkata';

function istDateString(d = new Date()): string {
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function addDaysIst(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ExamReminderJob {
  private readonly logger = new Logger(ExamReminderJob.name);

  constructor(
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,

    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamSchedule) private readonly scheduleRepo: Repository<ExamSchedule>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
  ) {}

  /**
   * Sends reminders for TOMORROW exams:
   * - Students of that class/section
   * - Class teacher of that class/section (best effort)
   */
  @Cron('0 0 18 * * *', { timeZone: TZ_IST }) // 06:00 PM IST
  async run() {
    const today = istDateString();
    const tomorrow = addDaysIst(today, 1);
    const lockKey = `job:exam-reminder:${tomorrow}`;

    const locked = await this.redis.tryLock(lockKey, 60 * 20);
    if (!locked) return;

    this.logger.log(`Running ExamReminderJob for examDate=${tomorrow}`);

    const schools = await this.schoolRepo.find({ where: { isActive: true } as any, select: ['id'] as any });

    for (const s of schools) {
      const schoolId = (s as any).id as string;

      try {
        // Get schedules for tomorrow + active exam join
        const schedules = await this.scheduleRepo
          .createQueryBuilder('sch')
          .innerJoin(Exam, 'e', 'e.id = sch.exam_id')
          .where('sch.school_id = :schoolId', { schoolId })
          .andWhere('sch.exam_date = :tomorrow', { tomorrow })
          .andWhere('e.is_active = true')
          .select([
            'sch.id',
            'sch.examId',
            'sch.classNumber',
            'sch.section',
            'sch.subject',
            'sch.timing',
            'sch.examDate',
          ] as any)
          .getMany();

        if (!schedules.length) continue;

        // Group by class/section
        const byClass = new Map<string, ExamSchedule[]>();
        for (const sc of schedules) {
          const key = `${(sc as any).classNumber}::${(sc as any).section ?? ''}`;
          const arr = byClass.get(key) ?? [];
          arr.push(sc);
          byClass.set(key, arr);
        }

        for (const [key, list] of byClass.entries()) {
          const [classStr, secStr] = key.split('::');
          const classNumber = Number(classStr);
          const section = secStr ? secStr : null;

          const students = await this.studentRepo.find({
            where: { schoolId, classNumber, section } as any,
            select: ['userId'] as any,
          });

          // Best-effort class teacher lookup
          const classTeacher = await this.teacherRepo.findOne({
            where: { schoolId, classTeacherClass: classNumber, classTeacherSection: section } as any,
          });

          const subjects = list.map((x) => `${(x as any).subject} (${(x as any).timing})`);
          const shown = subjects.slice(0, 3);
          const more = subjects.length - shown.length;
          const subjectText = more > 0 ? `${shown.join(', ')} and ${more} more` : shown.join(', ');

          const title = 'Exam Reminder';
          const body = `Tomorrow: ${subjectText} - Class ${classNumber}${section ?? ''}`;

          // Notify students
          await Promise.all(
            students.map(async (st) => {
              const userId = (st as any).userId;
              if (!userId) return;
              try {
                await this.notifications.createForUser({
                  schoolId,
                  userId,
                  title,
                  body,
                  imageUrl: null,
                  data: {
                    type: 'EXAM_REMINDER',
                    date: tomorrow,
                    classNumber: String(classNumber),
                    section: section ?? '',
                  },
                  push: true,
                });
              } catch {
                // ignore
              }
            }),
          );

          // Notify class teacher (if exists)
          const teacherUserId = (classTeacher as any)?.userId;
          if (teacherUserId) {
            try {
              await this.notifications.createForUser({
                schoolId,
                userId: teacherUserId,
                title,
                body,
                imageUrl: null,
                data: {
                  type: 'EXAM_REMINDER',
                  date: tomorrow,
                  classNumber: String(classNumber),
                  section: section ?? '',
                },
                push: true,
              });
            } catch {
              // ignore
            }
          }
        }
      } catch (e: any) {
        this.logger.error(`ExamReminderJob failed for schoolId=${schoolId}`, e?.stack || e);
      }
    }

    this.logger.log(`ExamReminderJob done for ${tomorrow}`);
  }
}
