import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { RequestUser } from '../../common/types/request-user.type';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationListQueryDto } from './dto/notification-list.query.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { FcmService } from '../../integrations/firebase/fcm.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fcm: FcmService,
    @InjectRepository(DeviceToken) private readonly deviceRepo: Repository<DeviceToken>,
    @InjectRepository(NotificationEntity) private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  async listMine(current: RequestUser, query: NotificationListQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.school_id = :schoolId', { schoolId })
      .andWhere('n.user_id = :userId', { userId: current.userId });

    if (query.isRead !== undefined) {
      qb.andWhere('n.is_read = :isRead', { isRead: query.isRead });
    }

    if (query.search) {
      const s = query.search.trim();
      qb.andWhere('(n.title ILIKE :q OR COALESCE(n.body, \'\') ILIKE :q)', { q: `%${s}%` });
    }

    qb.orderBy('n.created_at', 'DESC').skip(query.skip).take(query.take);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        imageUrl: r.imageUrl,
        data: r.data,
        isRead: r.isRead,
        createdAt: r.createdAt,
        readAt: r.readAt,
      })),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }

  async markRead(current: RequestUser, dto: MarkNotificationReadDto) {
    const { schoolId } = this.assertSchoolScope(current);

    if (dto.all === true) {
      await this.notifRepo
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({ isRead: true, readAt: () => 'now()' })
        .where('school_id = :schoolId AND user_id = :userId AND is_read = false', {
          schoolId,
          userId: current.userId,
        })
        .execute();

      return { message: 'All notifications marked as read' };
    }

    if (!dto.notificationId) {
      throw new BadRequestException('notificationId or all=true is required');
    }

    const n = await this.notifRepo.findOne({
      where: { id: dto.notificationId, schoolId, userId: current.userId },
    });

    if (!n) throw new NotFoundException('Notification not found');

    if (!n.isRead) {
      n.isRead = true;
      n.readAt = new Date();
      await this.notifRepo.save(n);
    }

    return { message: 'Notification marked as read' };
  }

  /**
   * Reusable helper for other modules (attendance/circulars/etc.)
   * Stores in notifications table and optionally sends FCM.
   */
  async createForUser(params: {
    schoolId: string;
    userId: string;
    title: string;
    body?: string | null;
    imageUrl?: string | null;
    data?: Record<string, any> | null;
    push?: boolean;
  }): Promise<{ notificationId: string }> {
    const row = this.notifRepo.create({
      schoolId: params.schoolId,
      userId: params.userId,
      title: params.title,
      body: params.body ?? null,
      imageUrl: params.imageUrl ?? null,
      data: params.data ?? null,
      isRead: false,
      readAt: null,
    });

    const saved = await this.notifRepo.save(row);

    if (params.push && this.fcm.isEnabled()) {
      const tokens = await this.getUserTokens(params.userId);
      if (tokens.length) {
        await this.fcm.sendToTokens(tokens, {
          title: params.title,
          body: params.body ?? '',
          imageUrl: params.imageUrl ?? undefined,
          data: params.data ?? undefined,
        });
      }
    }

    return { notificationId: saved.id };
  }

  async getUserTokens(userId: string): Promise<string[]> {
    const rows = await this.deviceRepo.find({
      where: { userId },
      select: ['fcmToken'],
    });
    return rows.map((r) => r.fcmToken).filter(Boolean);
  }

  /**
   * Update / upsert device token (used by Auth login + register-device)
   */
  async upsertDeviceToken(params: {
    userId: string;
    deviceId: string;
    fcmToken: string;
    platform?: string | null;
  }): Promise<void> {
    // Use raw SQL because ON CONFLICT is easiest and matches migration
    await this.dataSource.query(
      `
      INSERT INTO device_tokens (user_id, device_id, fcm_token, platform, last_seen_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now(), now())
      ON CONFLICT (user_id, device_id)
      DO UPDATE SET fcm_token=EXCLUDED.fcm_token, platform=EXCLUDED.platform, last_seen_at=now(), updated_at=now();
      `,
      [params.userId, params.deviceId, params.fcmToken, params.platform ?? null],
    );
  }
}
