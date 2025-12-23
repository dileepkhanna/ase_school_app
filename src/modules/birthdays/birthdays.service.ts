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

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';

import { NotificationsService } from '../notifications/notifications.service';

const BIRTHDAY_QUOTES = [
  'Wishing you a day filled with joy and laughter.',
  'May your year ahead be full of success and happiness.',
  'Have a wonderful birthday and a fantastic year ahead!',
  'Wishing you good health, peace, and prosperity.',
  'May your special day be as amazing as you are!',
];

function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDobToMonthDay(
  dob: Date | string | null | undefined,
): { month: number; day: number } | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function nextBirthdayFromMonthDay(
  todayUtc: Date,
  md: { month: number; day: number },
): Date {
  const y = todayUtc.getUTCFullYear();
  const candidate = new Date(Date.UTC(y, md.month - 1, md.day));
  // Handle Feb 29 gracefully: if invalid date, JS rolls; we detect and clamp to Feb 28.
  if (candidate.getUTCMonth() !== md.month - 1 || candidate.getUTCDate() !== md.day) {
    // clamp to last valid day of that month
    const last = new Date(Date.UTC(y, md.month, 0));
    return last;
  }
  if (candidate.getTime() < todayUtc.getTime()) {
    const next = new Date(Date.UTC(y + 1, md.month - 1, md.day));
    if (next.getUTCMonth() !== md.month - 1 || next.getUTCDate() !== md.day) {
      const lastNext = new Date(Date.UTC(y + 1, md.month, 0));
      return lastNext;
    }
    return next;
  }
  return candidate;
}

function diffDays(todayUtc: Date, targetUtc: Date): number {
  const ms = targetUtc.getTime() - todayUtc.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function pickQuote(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return BIRTHDAY_QUOTES[h % BIRTHDAY_QUOTES.length];
}

@Injectable()
export class BirthdaysService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,

    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  // =========================================================
  // Principal + Teacher: upcoming teacher birthdays (T-3..T-0 by default)
  // =========================================================
  async listUpcomingTeacherBirthdays(current: RequestUser, days = 3) {
    const { schoolId } = this.assertSchoolScope(current);

    if (![Role.PRINCIPAL, Role.TEACHER].includes(current.role)) {
      throw new ForbiddenException('Only principal/teacher can access teacher birthdays');
    }

    const today = toUtcDateOnly(new Date());
    const maxDays = Math.max(0, Math.min(30, Number(days ?? 3)));

    const teachers = await this.teacherRepo.find({
      where: { schoolId },
      order: { fullName: 'ASC' },
    });

    const items = teachers
      .map((t) => {
        const md = parseDobToMonthDay((t as any).dob);
        if (!md) return null;

        const next = nextBirthdayFromMonthDay(today, md);
        const d = diffDays(today, next);

        if (d < 0 || d > maxDays) return null;

        const countdownText =
          d === 0 ? 'Happy Birthday 🎉' : `${d} day${d === 1 ? '' : 's'} to ${t.fullName}'s Birthday`;

        return {
          teacherUserId: t.userId,
          teacherProfileId: t.id,
          fullName: t.fullName,
          profilePhotoUrl: (t as any).profilePhotoUrl ?? null,
          birthdayDate: next.toISOString().slice(0, 10),
          daysLeft: d,
          countdownText,
          quote: d === 0 ? pickQuote(String(t.userId)) : null,
        };
      })
      .filter(Boolean) as any[];

    // sort: soonest first, then alphabetically
    items.sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return String(a.fullName).localeCompare(String(b.fullName));
    });

    return {
      rangeDays: maxDays,
      today: today.toISOString().slice(0, 10),
      items,
    };
  }

  // =========================================================
  // Student: today's classmates birthdays only (no T-3)
  // =========================================================
  async listTodaysClassmateBirthdays(current: RequestUser) {
    const { schoolId } = this.assertSchoolScope(current);

    if (current.role !== Role.STUDENT) throw new ForbiddenException('Only students can access this');

    const me = await this.studentRepo.findOne({
      where: { schoolId, userId: current.userId } as any,
    });
    if (!me) throw new NotFoundException('Student profile not found');

    const today = toUtcDateOnly(new Date());
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();

    // ✅ FIX: TypeORM where cannot accept `null` directly; use IsNull()
    const sectionWhere = me.section ?? IsNull();

    const classmates = await this.studentRepo.find({
      where: {
        schoolId,
        classNumber: me.classNumber,
        section: sectionWhere,
      } as any,
      order: { fullName: 'ASC' as any },
    });

    const items = classmates
      .map((s) => {
        const md = parseDobToMonthDay((s as any).dob);
        if (!md) return null;
        if (md.month !== todayMonth || md.day !== todayDay) return null;

        return {
          studentProfileId: s.id,
          fullName: s.fullName,
          profilePhotoUrl: (s as any).profilePhotoUrl ?? null,
        };
      })
      .filter(Boolean);

    return {
      classNumber: me.classNumber,
      section: me.section ?? null,
      today: today.toISOString().slice(0, 10),
      items,
    };
  }

  // =========================================================
  // AUTOMATION HOOK:
  // Call this once per day (via cron / server scheduler / admin job)
  // Sends T-3..T-0 notifications to Principal + Teachers.
  // =========================================================
  async dispatchDailyTeacherBirthdayNotifications(current: RequestUser, days = 3) {
    // Security: only principal can trigger (or later: ADMIN)
    if (current.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can dispatch');
    const { schoolId } = this.assertSchoolScope(current);

    const upcoming = await this.listUpcomingTeacherBirthdays(current, days);
    const today = upcoming.today;

    // recipients: all principals + teachers in this school
    const recipients = await this.userRepo.find({
      where: [
        { schoolId, role: Role.PRINCIPAL, isActive: true } as any,
        { schoolId, role: Role.TEACHER, isActive: true } as any,
      ],
      select: ['id', 'role'],
    });

    // For each upcoming teacher, send notification based on daysLeft.
    for (const t of upcoming.items) {
      const d = t.daysLeft as number;

      let title = '';
      let body = '';
      if (d === 0) {
        title = 'Happy Birthday 🎉';
        body = `Happy Birthday ${t.fullName}! ${t.quote ?? ''}`.trim();
      } else {
        title = 'Upcoming Birthday';
        body = `${d} day${d === 1 ? '' : 's'} to ${t.fullName}'s Birthday`;
      }

      const data = {
        type: 'BIRTHDAY',
        scope: 'TEACHER',
        teacherUserId: t.teacherUserId,
        date: today,
        daysLeft: String(d),
      };

      // Best-effort fanout
      await Promise.all(
        recipients.map(async (u) => {
          try {
            await this.notifications.createForUser({
              schoolId,
              userId: (u as any).id,
              title,
              body,
              imageUrl: t.profilePhotoUrl ?? null,
              data,
              push: true,
            });
          } catch {
            // do not break on errors
          }
        }),
      );
    }

    return {
      message: 'Birthday notifications dispatched',
      today,
      teachersNotified: upcoming.items.length,
      recipients: recipients.length,
    };
  }
}
