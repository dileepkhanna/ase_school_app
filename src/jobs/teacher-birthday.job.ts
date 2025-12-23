import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../integrations/redis/redis.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

import { School } from '../modules/schools/entities/school.entity';
import { User } from '../modules/users/entities/user.entity';
import { TeacherProfile } from '../modules/teachers/entities/teacher-profile.entity';

import { Role } from '../common/enums/role.enum';

const TZ_IST = 'Asia/Kolkata';

function istDateString(d = new Date()): string {
  // Convert "now" to IST date string YYYY-MM-DD
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function parseDobToMonthDay(dob: any): { month: number; day: number } | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(`${dob}T00:00:00.000Z`) : new Date(dob);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function nextBirthdayFromMonthDay(todayIst: string, md: { month: number; day: number }): Date {
  const [yStr] = todayIst.split('-');
  const y = Number(yStr);
  const today = new Date(`${todayIst}T00:00:00.000Z`);

  const candidate = new Date(Date.UTC(y, md.month - 1, md.day));
  const fixedCandidate =
    candidate.getUTCMonth() === md.month - 1 && candidate.getUTCDate() === md.day
      ? candidate
      : new Date(Date.UTC(y, md.month, 0)); // clamp

  if (fixedCandidate.getTime() < today.getTime()) {
    const next = new Date(Date.UTC(y + 1, md.month - 1, md.day));
    return next.getUTCMonth() === md.month - 1 && next.getUTCDate() === md.day
      ? next
      : new Date(Date.UTC(y + 1, md.month, 0));
  }
  return fixedCandidate;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

const QUOTES = [
  'Wishing you a day filled with joy and laughter.',
  'May your year ahead be full of success and happiness.',
  'Have a wonderful birthday and a fantastic year ahead!',
  'Wishing you good health, peace, and prosperity.',
  'May your special day be as amazing as you are!',
];

function pickQuote(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}

@Injectable()
export class TeacherBirthdayJob {
  private readonly logger = new Logger(TeacherBirthdayJob.name);

  constructor(
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,

    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
  ) {}

  /**
   * Runs daily (IST) and sends T-3..T-0 teacher birthday notifications to:
   * - all Principals
   * - all Teachers
   */
  @Cron('0 5 8 * * *', { timeZone: TZ_IST }) // 08:05 IST
  async run() {
    const today = istDateString();
    const lockKey = `job:teacher-birthday:${today}`;

    const locked = await this.redis.tryLock(lockKey, 60 * 20); // 20 min lock
    if (!locked) return;

    this.logger.log(`Running TeacherBirthdayJob for IST date ${today}`);

    const schools = await this.schoolRepo.find({ where: { isActive: true } as any, select: ['id'] as any });

    for (const s of schools) {
      const schoolId = (s as any).id as string;

      try {
        const teachers = await this.teacherRepo.find({ where: { schoolId } as any, order: { fullName: 'ASC' } as any });

        const todayUtc = new Date(`${today}T00:00:00.000Z`);

        const upcoming = teachers
          .map((t) => {
            const md = parseDobToMonthDay((t as any).dob);
            if (!md) return null;

            const next = nextBirthdayFromMonthDay(today, md);
            const d = diffDays(todayUtc, next);
            if (d < 0 || d > 3) return null;

            return {
              teacherUserId: (t as any).userId,
              fullName: (t as any).fullName,
              profilePhotoUrl: (t as any).profilePhotoUrl ?? null,
              daysLeft: d,
              quote: d === 0 ? pickQuote(String((t as any).userId)) : null,
            };
          })
          .filter(Boolean) as Array<any>;

        if (!upcoming.length) continue;

        // recipients: all principals + teachers in this school
        const recipients = await this.userRepo.find({
          where: [
            { schoolId, role: Role.PRINCIPAL, isActive: true } as any,
            { schoolId, role: Role.TEACHER, isActive: true } as any,
          ],
          select: ['id'] as any,
        });

        for (const t of upcoming) {
          const d = t.daysLeft as number;
          const title = d === 0 ? 'Happy Birthday 🎉' : 'Upcoming Birthday';
          const body =
            d === 0
              ? `Happy Birthday ${t.fullName}! ${t.quote ?? ''}`.trim()
              : `${d} day${d === 1 ? '' : 's'} to ${t.fullName}'s Birthday`;

          await Promise.all(
            recipients.map(async (u) => {
              try {
                await this.notifications.createForUser({
                  schoolId,
                  userId: (u as any).id,
                  title,
                  body,
                  imageUrl: t.profilePhotoUrl,
                  data: {
                    type: 'BIRTHDAY',
                    scope: 'TEACHER',
                    teacherUserId: t.teacherUserId,
                    daysLeft: String(d),
                    date: today,
                  },
                  push: true,
                });
              } catch {
                // ignore per-user
              }
            }),
          );
        }
      } catch (e: any) {
        this.logger.error(`TeacherBirthdayJob failed for schoolId=${schoolId}`, e?.stack || e);
      }
    }

    this.logger.log(`TeacherBirthdayJob done for ${today}`);
  }
}
