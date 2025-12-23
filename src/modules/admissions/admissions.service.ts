import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { AdmissionStatus } from '../../common/enums/admission-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { Admission } from './entities/admission.entity';
import { AdmissionListQueryDto } from './dto/admission-list.query.dto';
import { UpdateAdmissionStatusDto } from './dto/update-admission-status.dto';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { ReferralsStudentsService } from '../referrals-students/referrals-students.service';
import { NotificationsService } from '../notifications/notifications.service';

const ADMISSION_REWARD_AMOUNT = 1000;

function computeRewardStatus(admissionStatus: AdmissionStatus, paymentStatus: PaymentStatus): 'PENDING' | 'REWARDED' {
  if (admissionStatus === AdmissionStatus.JOINED && paymentStatus === PaymentStatus.DONE) return 'REWARDED';
  return 'PENDING';
}

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(Admission) private readonly repo: Repository<Admission>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,

    private readonly referralsStudents: ReferralsStudentsService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can access admissions');
  }

  // =========================================================
  // Principal: list ONLY admissions created from referrals
  // =========================================================
  async list(current: RequestUser, q: AdmissionListQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.school_id = :schoolId', { schoolId })
      // Dependency rule hard-check:
      .andWhere('a.referral_id IS NOT NULL')
      .orderBy('a.created_at', 'DESC')
      .skip(q.skip)
      .take(q.take);

    if (q.applyingClass) qb.andWhere('a.applying_class = :ac', { ac: q.applyingClass });
    if (q.admissionStatus) qb.andWhere('a.admission_status = :as', { as: q.admissionStatus });
    if (q.paymentStatus) qb.andWhere('a.payment_status = :ps', { ps: q.paymentStatus });
    if (q.rewardStatus) qb.andWhere('a.reward_status = :rs', { rs: q.rewardStatus });

    // Search by student name / phone / teacher name
    if (q.search) {
      const s = q.search.trim();
      const teacherIdsByName = await this.teacherRepo
        .createQueryBuilder('t')
        .select('t.userId', 'userId')
        .where('t.schoolId = :schoolId', { schoolId })
        .andWhere('t.fullName ILIKE :q', { q: `%${s}%` })
        .getRawMany<{ userId: string }>();

      const teacherUserIds = teacherIdsByName.map((x) => x.userId);

      qb.andWhere(
        new Brackets((b) => {
          b.where('a.student_name ILIKE :q', { q: `%${s}%` })
            .orWhere('a.phone_number ILIKE :q', { q: `%${s}%` });

          if (teacherUserIds.length) {
            b.orWhere('a.referring_teacher_user_id IN (:...tids)', { tids: teacherUserIds });
          }
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    // Map teacher name for list UI
    const teacherIds = Array.from(new Set(rows.map((r) => r.referringTeacherUserId)));
    const teachers = teacherIds.length
      ? await this.teacherRepo.find({ where: teacherIds.map((id) => ({ schoolId, userId: id })) })
      : [];

    const teacherByUser = new Map<string, TeacherProfile>();
    for (const t of teachers) teacherByUser.set(t.userId, t);

    return {
      items: rows.map((a) => {
        const t = teacherByUser.get(a.referringTeacherUserId);
        return this.map(a, t ?? null);
      }),
      total,
      page: q.page ?? 1,
      limit: q.take,
    };
  }

  async getOne(current: RequestUser, id: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const a = await this.repo.findOne({ where: { id, schoolId } });
    if (!a || !a.referralId) throw new NotFoundException('Admission not found');

    const t = await this.teacherRepo.findOne({ where: { schoolId, userId: a.referringTeacherUserId } });
    return this.map(a, t ?? null);
  }

  // =========================================================
  // Principal: update admission + payment status
  // This auto syncs back to Teacher Referral (8.16) and optionally notifies teacher.
  // =========================================================
  async updateStatus(current: RequestUser, id: string, dto: UpdateAdmissionStatusDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const a = await this.repo.findOne({ where: { id, schoolId } });
    if (!a || !a.referralId) throw new NotFoundException('Admission not found');

    const admissionStatus = dto.admissionStatus === 'JOINED' ? AdmissionStatus.JOINED : AdmissionStatus.NOT_JOINED;
    const paymentStatus = dto.paymentStatus === 'DONE' ? PaymentStatus.DONE : PaymentStatus.PENDING;

    a.admissionStatus = admissionStatus;
    a.paymentStatus = paymentStatus;
    a.rewardStatus = computeRewardStatus(admissionStatus, paymentStatus);

    await this.repo.save(a);

    // Sync back to referral (teacher app visibility)
    try {
      await this.referralsStudents.syncStatusFromNewAdmission({
        schoolId,
        referralId: a.referralId,
        newAdmissionId: a.id,
        admissionStatus: a.admissionStatus,
        paymentStatus: a.paymentStatus,
      });
    } catch {
      // If referral missing, still keep admission updated (do not rollback)
    }

    // Optional: notify teacher about status update (best-effort)
    const teacherTitle = 'New Admission Update';
    const teacherBody = `Status updated: ${a.admissionStatus} / ${a.paymentStatus}`;
    try {
      await this.notifications.createForUser({
        schoolId,
        userId: a.referringTeacherUserId,
        title: teacherTitle,
        body: dto.note ? `${teacherBody} - ${dto.note}` : teacherBody,
        imageUrl: null,
        data: {
          type: 'NEW_ADMISSION',
          admissionId: a.id,
          referralId: a.referralId,
          admissionStatus: a.admissionStatus,
          paymentStatus: a.paymentStatus,
          rewardStatus: a.rewardStatus,
        },
        push: true,
      });
    } catch {
      // ignore
    }

    const t = await this.teacherRepo.findOne({ where: { schoolId, userId: a.referringTeacherUserId } });
    return this.map(a, t ?? null);
  }

  // =========================================================
  // INTERNAL (used later): create admission from referral (the only allowed creation)
  // We'll call this from referrals-students module when we "wire everything".
  // =========================================================
  async createFromReferral(params: {
    schoolId: string;
    referralId: string;
    teacherUserId: string;
    studentName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    applyingClass: number;
    phoneNumber: string;
  }) {
    // Ensure unique referralId per school
    const exists = await this.repo.exist({ where: { schoolId: params.schoolId, referralId: params.referralId } });
    if (exists) throw new BadRequestException('Admission already exists for this referral');

    const admissionStatus = AdmissionStatus.NOT_JOINED;
    const paymentStatus = PaymentStatus.PENDING;

    const a = this.repo.create({
      schoolId: params.schoolId,
      referralId: params.referralId,
      referringTeacherUserId: params.teacherUserId,
      studentName: params.studentName.trim(),
      gender: params.gender,
      applyingClass: params.applyingClass,
      phoneNumber: params.phoneNumber,
      admissionStatus,
      paymentStatus,
      rewardStatus: computeRewardStatus(admissionStatus, paymentStatus),
    });

    const saved = await this.repo.save(a);
    return saved;
  }

  private map(a: Admission, t: TeacherProfile | null) {
    return {
      id: a.id,
      schoolId: a.schoolId,
      referralId: a.referralId,
      submissionDate: a.createdAt,

      studentName: a.studentName,
      gender: a.gender,
      applyingClass: a.applyingClass,
      phoneNumber: a.phoneNumber,

      referringTeacher: {
        userId: a.referringTeacherUserId,
        name: t?.fullName ?? null,
        profilePhotoUrl: (t as any)?.profilePhotoUrl ?? null,
      },

      admissionStatus: a.admissionStatus,
      paymentStatus: a.paymentStatus,
      rewardStatus: a.rewardStatus,

      rewardAmount: ADMISSION_REWARD_AMOUNT,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
