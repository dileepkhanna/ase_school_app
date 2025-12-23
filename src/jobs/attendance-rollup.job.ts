import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../integrations/redis/redis.service';

import { School } from '../modules/schools/entities/school.entity';
import { TeacherProfile } from '../modules/teachers/entities/teacher-profile.entity';

import { Recap } from '../modules/recaps/entities/recap.entity';
import { Homework } from '../modules/homework/entities/homework.entity';

import { TeacherAttendance } from '../modules/attendance/entities/teacher-attendance.entity';
import { AttendanceStatus } from '../common/enums/attendance.enum';

const TZ_IST = 'Asia/Kolkata';

function istDateString(d = new Date()): string {
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function istDayRangeUtc(istDate: string): { startUtc: Date; endUtc: Date } {
  // IST midnight in UTC is previous day 18:30
  const startUtc = new Date(`${istDate}T00:00:00.000Z`);
  // shift back by 5h30m to represent IST midnight in UTC
  startUtc.setUTCMinutes(startUtc.getUTCMinutes() - 330);

  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

@Injectable()
export class AttendanceRollupJob {
  private readonly logger = new Logger(AttendanceRollupJob.name);

  constructor(
    private readonly redis: RedisService,

    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(Recap) private readonly recapRepo: Repository<Recap>,
    @InjectRepository(Homework) private readonly homeworkRepo: Repository<Homework>,
    @InjectRepository(TeacherAttendance) private readonly teacherAttendanceRepo: Repository<TeacherAttendance>,
  ) {}

  /**
   * Daily rollup for teacher attendance (IST end-of-day)
   * Simple, production-safe baseline:
   * - If teacher posted BOTH recap and homework at least once today => PRESENT
   * - If teacher posted only one => HALF_DAY
   * - Else => ABSENT
   *
   * (Later we can upgrade this to "per timetable slot completion" logic.)
   */
  @Cron('0 55 23 * * *', { timeZone: TZ_IST }) // 11:55 PM IST
  async run() {
    const today = istDateString();
    const lockKey = `job:attendance-rollup:${today}`;

    const locked = await this.redis.tryLock(lockKey, 60 * 30);
    if (!locked) return;

    this.logger.log(`Running AttendanceRollupJob for IST date ${today}`);

    const { startUtc, endUtc } = istDayRangeUtc(today);

    const schools = await this.schoolRepo.find({ where: { isActive: true } as any, select: ['id'] as any });

    for (const s of schools) {
      const schoolId = (s as any).id as string;

      try {
        const teachers = await this.teacherRepo.find({ where: { schoolId } as any, select: ['userId'] as any });

        for (const t of teachers) {
          const teacherUserId = (t as any).userId as string;
          if (!teacherUserId) continue;

          const recapCount = await this.recapRepo
            .createQueryBuilder('r')
            .where('r.schoolId = :schoolId', { schoolId })
            .andWhere('r.teacherUserId = :tid', { tid: teacherUserId })
            .andWhere('r.createdAt >= :startUtc AND r.createdAt < :endUtc', { startUtc, endUtc })
            .getCount();

          const homeworkCount = await this.homeworkRepo
            .createQueryBuilder('h')
            .where('h.schoolId = :schoolId', { schoolId })
            .andWhere('h.teacherUserId = :tid', { tid: teacherUserId })
            .andWhere('h.createdAt >= :startUtc AND h.createdAt < :endUtc', { startUtc, endUtc })
            .getCount();

          let status: AttendanceStatus;
          if (recapCount > 0 && homeworkCount > 0) status = AttendanceStatus.PRESENT;
          else if (recapCount > 0 || homeworkCount > 0) status = AttendanceStatus.HALF_DAY;
          else status = AttendanceStatus.ABSENT;

          // Upsert attendance for today
          const existing = await this.teacherAttendanceRepo.findOne({
            where: { schoolId, teacherUserId, date: today } as any,
          });

          if (!existing) {
            await this.teacherAttendanceRepo.save(
              this.teacherAttendanceRepo.create({
                schoolId,
                teacherUserId,
                date: today,
                status,
              } as any),
            );
          } else {
            (existing as any).status = status;
            await this.teacherAttendanceRepo.save(existing);
          }
        }
      } catch (e: any) {
        this.logger.error(`AttendanceRollupJob failed for schoolId=${schoolId}`, e?.stack || e);
      }
    }

    this.logger.log(`AttendanceRollupJob done for ${today}`);
  }
}
