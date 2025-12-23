import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { AdmissionStatus } from '../../common/enums/admission-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { StudentReferral } from './entities/student-referral.entity';
import { CreateStudentReferralDto } from './dto/create-student-referral.dto';
import { StudentReferralListQueryDto } from './dto/student-referral-list.query.dto';

const ADMISSION_REWARD_AMOUNT = 1000; // ₹1,000 per joined+paid admission

@Injectable()
export class ReferralsStudentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StudentReferral) private readonly repo: Repository<StudentReferral>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertTeacher(user: RequestUser) {
    if (user.role !== Role.TEACHER) throw new ForbiddenException('Only teachers can use this module');
  }

  // =========================================================
  // Teacher: Create referral
  // IMPORTANT: New Admission record will be created in 8.17 module.
  // We keep this service "ready" with a best-effort auto-link if the table exists.
  // =========================================================
  async create(current: RequestUser, dto: CreateStudentReferralDto) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    // Basic duplicate protections (fraud-safe)
    const phone = dto.phoneNumber.trim();
    const exists = await this.repo.exist({ where: { schoolId, phoneNumber: phone } });
    if (exists) {
      throw new BadRequestException('This phone number is already referred in this school');
    }

    const row = this.repo.create({
      schoolId,
      teacherUserId: current.userId,
      studentName: dto.studentName.trim(),
      gender: dto.gender,
      applyingClass: dto.applyingClass,
      phoneNumber: phone,
      newAdmissionId: null,
      admissionStatus: AdmissionStatus.NOT_JOINED,
      paymentStatus: PaymentStatus.PENDING,
      rewardStatus: 'PENDING',
    });

    const saved = await this.repo.save(row);

    // Best-effort: if New Admission module/table already exists, create a linked record.
    // This will be fully wired when we implement 8.17 New Admission.
    await this.tryAutoCreateNewAdmissionIfTableExists(saved).catch(() => {
      // silent: do not fail referral creation if admission auto-create is not wired yet
    });

    return this.map(saved);
  }

  // =========================================================
  // Teacher: List + filters
  // =========================================================
  async listMy(current: RequestUser, q: StudentReferralListQueryDto) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.school_id = :schoolId', { schoolId })
      .andWhere('r.teacher_user_id = :tid', { tid: current.userId })
      .orderBy('r.created_at', 'DESC')
      .skip(q.skip)
      .take(q.take);

    if (q.applyingClass) qb.andWhere('r.applying_class = :ac', { ac: q.applyingClass });

    if (q.admissionStatus) qb.andWhere('r.admission_status = :as', { as: q.admissionStatus });
    if (q.paymentStatus) qb.andWhere('r.payment_status = :ps', { ps: q.paymentStatus });
    if (q.rewardStatus) qb.andWhere('r.reward_status = :rs', { rs: q.rewardStatus });

    if (q.search) {
      const s = q.search.trim();
      qb.andWhere(
        new Brackets((b) => {
          b.where('r.student_name ILIKE :q', { q: `%${s}%` }).orWhere('r.phone_number ILIKE :q', { q: `%${s}%` });
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((x) => this.map(x)),
      total,
      page: q.page ?? 1,
      limit: q.take,
    };
  }

  // =========================================================
  // Teacher: Summary cards
  // =========================================================
  async mySummary(current: RequestUser) {
    this.assertTeacher(current);
    const { schoolId } = this.assertSchoolScope(current);

    const totalReferrals = await this.repo.count({ where: { schoolId, teacherUserId: current.userId } });

    const totalJoined = await this.repo.count({
      where: { schoolId, teacherUserId: current.userId, admissionStatus: AdmissionStatus.JOINED },
    });

    const totalRewarded = await this.repo.count({
      where: { schoolId, teacherUserId: current.userId, rewardStatus: 'REWARDED' },
    });

    return {
      totalReferrals,
      totalJoined,
      totalRewarded,
      totalReferralReward: totalRewarded * ADMISSION_REWARD_AMOUNT,
      rewardAmountPerAdmission: ADMISSION_REWARD_AMOUNT,
    };
  }

  // =========================================================
  // Internal: called by New Admission module (8.17) to sync status
  // =========================================================
  async syncStatusFromNewAdmission(params: {
    schoolId: string;
    referralId: string;
    newAdmissionId: string;
    admissionStatus: AdmissionStatus;
    paymentStatus: PaymentStatus;
  }) {
    const r = await this.repo.findOne({ where: { id: params.referralId, schoolId: params.schoolId } });
    if (!r) throw new NotFoundException('Referral not found');

    r.newAdmissionId = params.newAdmissionId;
    r.admissionStatus = params.admissionStatus;
    r.paymentStatus = params.paymentStatus;

    // Reward rule:
    // AdmissionStatus=JOINED AND PaymentStatus=DONE => reward becomes REWARDED
    if (r.admissionStatus === AdmissionStatus.JOINED && r.paymentStatus === PaymentStatus.DONE) {
      r.rewardStatus = 'REWARDED';
    } else {
      r.rewardStatus = 'PENDING';
    }

    await this.repo.save(r);
    return this.map(r);
  }

  // =========================================================
  // Best-effort auto-create New Admission record if table exists.
  // This will be fully wired in 8.17 using entities/services.
  // =========================================================
  private async tryAutoCreateNewAdmissionIfTableExists(ref: StudentReferral) {
    // If already linked, skip
    if (ref.newAdmissionId) return;

    // Check table existence (postgres)
    const rows = await this.dataSource.query(
      `SELECT to_regclass('public.new_admissions') as exists;`,
    );
    const exists = rows?.[0]?.exists;
    if (!exists) return;

    // Insert minimal row; 8.17 will standardize columns.
    // We store referralId linkage to enforce "only referrals appear in new admission".
    const inserted = await this.dataSource.query(
      `
      INSERT INTO new_admissions
        (school_id, referral_id, student_name, gender, applying_class, phone_number,
         admission_status, payment_status, reward_status, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6,
         $7, $8, $9, NOW(), NOW())
      RETURNING id;
      `,
      [
        ref.schoolId,
        ref.id,
        ref.studentName,
        ref.gender,
        ref.applyingClass,
        ref.phoneNumber,
        ref.admissionStatus,
        ref.paymentStatus,
        'PENDING',
      ],
    );

    const newAdmissionId = inserted?.[0]?.id;
    if (!newAdmissionId) return;

    ref.newAdmissionId = newAdmissionId;
    await this.repo.save(ref);
  }

  private map(r: StudentReferral) {
    return {
      id: r.id,
      schoolId: r.schoolId,
      teacherUserId: r.teacherUserId,

      studentName: r.studentName,
      gender: r.gender,
      applyingClass: r.applyingClass,
      phoneNumber: r.phoneNumber,

      newAdmissionId: r.newAdmissionId,

      admissionStatus: r.admissionStatus,
      paymentStatus: r.paymentStatus,
      rewardStatus: r.rewardStatus,

      rewardAmount: ADMISSION_REWARD_AMOUNT,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
