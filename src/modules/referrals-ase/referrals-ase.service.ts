import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { AseReferralStatus } from '../../common/enums/referral-status.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { AseReferral } from './entities/ase-referral.entity';
import { AseReferralAudit } from './entities/ase-referral-audit.entity';

import { CreateAseReferralDto } from './dto/create-ase-referral.dto';
import { AseReferralListQueryDto } from './dto/ase-referral-list.query.dto';

import { NotificationsService } from '../notifications/notifications.service';

const REWARD_AMOUNT = 5000;

function randomAlphaNum8(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing chars like 0/O/1/I
  let out = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) out += chars[bytes[i] % chars.length];
  return out;
}

@Injectable()
export class ReferralsAseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,

    @InjectRepository(AseReferral) private readonly repo: Repository<AseReferral>,
    @InjectRepository(AseReferralAudit) private readonly auditRepo: Repository<AseReferralAudit>,
  ) {}

  private assertSchoolScope(user: RequestUser): {
    schoolId: string;
    schoolCode?: string;
    schoolName?: string;
  } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return {
      schoolId: user.schoolId,
      schoolCode: (user as any).schoolCode,
      schoolName: (user as any).schoolName,
    };
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL)
      throw new ForbiddenException('Only principal can use this module');
  }

  // =========================================================
  // Principal: create ASE referral (referId auto)
  // =========================================================
  async create(current: RequestUser, dto: CreateAseReferralDto) {
    this.assertPrincipal(current);
    const { schoolId, schoolCode, schoolName } = this.assertSchoolScope(current);

    const phone = dto.phoneNumber.trim();
    if (!/^\d{10}$/.test(phone)) {
      throw new BadRequestException('phoneNumber must be 10 digits');
    }

    // Fraud rule: phone must be unique per referral (global unique recommended)
    const dupPhone = await this.repo.exist({
      where: { phoneNumber: phone, isActive: true } as any,
    });
    if (dupPhone) throw new BadRequestException('This phone number is already referred');

    // Same school cannot be referred multiple times (by name - best effort)
    const referredSchoolName = dto.referredSchoolName.trim();
    const dupSchool = await this.repo.exist({
      where: { referredSchoolName, isActive: true } as any,
    });
    if (dupSchool) throw new BadRequestException('This school is already referred');

    // Generate unique referId
    let referId = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const id = randomAlphaNum8();
      const exists = await this.repo.exist({ where: { referId: id } as any });
      if (!exists) {
        referId = id;
        break;
      }
    }
    if (!referId)
      throw new BadRequestException('Unable to generate Refer ID, please retry');

    const row = this.repo.create({
      referrerPrincipalUserId: current.userId,
      referrerSchoolId: schoolId,
      referrerSchoolCode: schoolCode ?? String((current as any).schoolCode ?? ''),
      referrerSchoolName:
        schoolName ?? String((current as any).schoolName ?? schoolCode ?? ''),

      referredSchoolName,
      candidateName: dto.candidateName.trim(),
      phoneNumber: phone,

      referId,

      status: AseReferralStatus.SUBMITTED,
      rewardAmount: REWARD_AMOUNT,
      payoutStatus: false, // Not Paid
      adminNotes: null,
      isActive: true,
    });

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();

      const saved = await qr.manager.getRepository(AseReferral).save(row);

      await qr.manager.getRepository(AseReferralAudit).save(
        qr.manager.getRepository(AseReferralAudit).create({
          aseReferralId: saved.id,
          schoolId: saved.referrerSchoolId,
          changedByUserId: current.userId,
          oldStatus: null,
          newStatus: saved.status,
          note: 'Created by principal',
        }),
      );

      await qr.commitTransaction();
      return this.map(saved);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // =========================================================
  // Principal: my referrals (read-only)
  // =========================================================
  async listMy(current: RequestUser, q: AseReferralListQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.referrer_school_id = :schoolId', { schoolId })
      .andWhere('r.referrer_principal_user_id = :pid', { pid: current.userId })
      .andWhere('r.is_active = true')
      .orderBy('r.created_at', 'DESC')
      .skip(q.skip)
      .take(q.take);

    if ((q as any).status) qb.andWhere('r.status = :st', { st: (q as any).status });
    if ((q as any).payoutStatus !== undefined) {
      // payoutStatus should be boolean now
      const paid =
        (q as any).payoutStatus === true || (q as any).payoutStatus === 'true';
      qb.andWhere('r.payout_status = :ps', { ps: paid });
    }

    if (q.search) {
      const s = q.search.trim();
      qb.andWhere(
        new Brackets((b) => {
          b.where('r.refer_id ILIKE :q', { q: `%${s}%` })
            .orWhere('r.phone_number ILIKE :q', { q: `%${s}%` })
            .orWhere('r.referred_school_name ILIKE :q', { q: `%${s}%` })
            .orWhere('r.candidate_name ILIKE :q', { q: `%${s}%` });
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

  async getOneMy(current: RequestUser, id: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const r = await this.repo.findOne({
      where: {
        id,
        referrerSchoolId: schoolId,
        referrerPrincipalUserId: current.userId,
        isActive: true,
      } as any,
    });

    if (!r) throw new NotFoundException('Referral not found');
    return this.map(r);
  }

  // =========================================================
  // ASE ADMIN PANEL (later web):
  // updates referral status + payout, keeps audit, sends notification
  // =========================================================
  async adminUpdateStatus(params: {
    referralId: string;
    changedByUserId: string;
    toStatus?: AseReferralStatus;
    adminNotes?: string | null;
    payoutStatus?: boolean | string;
    note?: string | null;
    notifyPrincipal?: boolean;
  }) {
    const r = await this.repo.findOne({
      where: { id: params.referralId, isActive: true } as any,
    });
    if (!r) throw new NotFoundException('Referral not found');

    const from = r.status;

    if (params.toStatus) r.status = params.toStatus;
    if (params.adminNotes !== undefined) r.adminNotes = params.adminNotes ?? null;
    if (params.payoutStatus !== undefined) {
      r.payoutStatus =
        params.payoutStatus === true || params.payoutStatus === 'true';
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();

      const saved = await qr.manager.getRepository(AseReferral).save(r);

      // write audit only when status changes OR notes/payout updated
      await qr.manager.getRepository(AseReferralAudit).save(
        qr.manager.getRepository(AseReferralAudit).create({
          aseReferralId: saved.id,
          schoolId: saved.referrerSchoolId,
          changedByUserId: params.changedByUserId,
          oldStatus: from,
          newStatus: saved.status,
          note: params.note ?? null,
        }),
      );

      await qr.commitTransaction();

      // Notify principal on status change (recommended)
      if (params.notifyPrincipal) {
        const title = 'Refer & Earn Update';
        const body = `Your referral ${saved.referId} status changed to ${saved.status}`;

        try {
          await this.notifications.createForUser({
            schoolId: saved.referrerSchoolId,
            userId: saved.referrerPrincipalUserId,
            title,
            body,
            imageUrl: null,
            data: {
              type: 'ASE_REFERRAL',
              referralId: saved.id,
              referId: saved.referId,
              status: saved.status,
              payoutStatus: saved.payoutStatus,
            },
            push: true,
          });
        } catch {
          // ignore notification failures
        }
      }

      return this.map(saved);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async adminGetAuditTrail(params: { referralId: string }) {
    const rows = await this.auditRepo.find({
      where: { aseReferralId: params.referralId } as any,
      order: { createdAt: 'DESC' } as any,
    });

    return rows.map((a) => ({
      id: a.id,
      aseReferralId: a.aseReferralId,
      changedByUserId: a.changedByUserId,
      oldStatus: a.oldStatus,
      newStatus: a.newStatus,
      note: a.note,
      createdAt: a.createdAt,
    }));
  }

  private map(r: AseReferral) {
    return {
      id: r.id,

      // referrer
      referrerSchoolId: r.referrerSchoolId,
      referrerPrincipalUserId: r.referrerPrincipalUserId,
      referrerSchoolCode: r.referrerSchoolCode,
      referrerSchoolName: r.referrerSchoolName,

      // referred
      referredSchoolName: r.referredSchoolName,
      candidateName: r.candidateName,
      phoneNumber: r.phoneNumber,

      referId: r.referId,

      status: r.status,
      rewardAmount: r.rewardAmount,
      payoutStatus: r.payoutStatus, // boolean

      adminNotes: r.adminNotes ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
