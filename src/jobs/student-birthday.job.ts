import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../integrations/redis/redis.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

import { School } from '../modules/schools/entities/school.entity';
import { StudentProfile } from '../modules/students/entities/student-profile.entity';

const TZ_IST = 'Asia/Kolkata';

function istDateString(d = new Date()): string {
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function monthDayFromDob(dob: any): { m: number; d: number } | null {
  if (!dob) return null;
  const dt = typeof dob === 'string' ? new Date(`${dob}T00:00:00.000Z`) : new Date(dob);
  if (Number.isNaN(dt.getTime())) return null;
  return { m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

@Injectable()
export class StudentBirthdayJob {
  private readonly logger = new Logger(StudentBirthdayJob.name);

  constructor(
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,

    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
  ) {}

  /**
   * Student rule:
   * - Students get ONLY same-class friends birthday notifications
   * - Only on the birthday day (no T-3)
   */
  @Cron('0 30 7 * * *', { timeZone: TZ_IST }) // 07:30 IST
  async run() {
    const today = istDateString();
    const lockKey = `job:student-birthday:${today}`;

    const locked = await this.redis.tryLock(lockKey, 60 * 20);
    if (!locked) return;

    this.logger.log(`Running StudentBirthdayJob for IST date ${today}`);

    const [yy, mm, dd] = today.split('-').map(Number);

    const schools = await this.schoolRepo.find({ where: { isActive: true } as any, select: ['id'] as any });

    for (const s of schools) {
      const schoolId = (s as any).id as string;

      try {
        // Load all students in school (safe baseline; can optimize later using SQL extract)
        const students = await this.studentRepo.find({ where: { schoolId } as any });

        // Find birthday students today
        const birthdayStudents = students.filter((st) => {
          const md = monthDayFromDob((st as any).dob);
          return md ? md.m === mm && md.d === dd : false;
        });

        if (!birthdayStudents.length) continue;

        // Group birthdays by class/section
        const groups = new Map<string, Array<any>>();
        for (const b of birthdayStudents) {
          const key = `${(b as any).classNumber}::${(b as any).section ?? ''}`;
          const arr = groups.get(key) ?? [];
          arr.push(b);
          groups.set(key, arr);
        }

        for (const [key, births] of groups.entries()) {
          const [classStr, secStr] = key.split('::');
          const classNumber = Number(classStr);
          const section = secStr ? secStr : null;

          const classmates = students.filter(
            (st) => (st as any).classNumber === classNumber && String((st as any).section ?? '') === String(section ?? ''),
          );

          // Build one combined notification per class/section
          const names = births.map((x) => (x as any).fullName).filter(Boolean);
          const shown = names.slice(0, 3);
          const more = names.length - shown.length;
          const nameText = more > 0 ? `${shown.join(', ')} and ${more} more` : shown.join(', ');
          const title = 'Birthday 🎉';
          const body = names.length === 1 ? `Today is ${nameText}'s Birthday` : `Today: ${nameText} Birthday`;

          await Promise.all(
            classmates.map(async (st) => {
              const userId = (st as any).userId;
              if (!userId) return;

              // Optional: exclude the birthday student from receiving their own class notification
              // (you can remove this check if you want them to also see it)
              const isBirthdayPerson = births.some((b) => (b as any).userId === userId);
              if (isBirthdayPerson) return;

              try {
                await this.notifications.createForUser({
                  schoolId,
                  userId,
                  title,
                  body,
                  imageUrl: null,
                  data: {
                    type: 'BIRTHDAY',
                    scope: 'STUDENT_CLASS',
                    classNumber: String(classNumber),
                    section: section ?? '',
                    date: today,
                  },
                  push: true,
                });
              } catch {
                // ignore per user
              }
            }),
          );
        }
      } catch (e: any) {
        this.logger.error(`StudentBirthdayJob failed for schoolId=${schoolId}`, e?.stack || e);
      }
    }

    this.logger.log(`StudentBirthdayJob done for ${today}`);
  }
}
