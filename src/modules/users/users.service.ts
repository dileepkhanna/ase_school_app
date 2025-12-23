import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RequestUser } from '../../common/types/request-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { hashPassword, verifyPassword } from '../../common/utils/crypto.util';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async getMe(current: RequestUser): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: current.userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ForbiddenException('Account disabled');
    return user;
  }

  async updateMe(current: RequestUser, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getMe(current);

    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null;
    }

    if (dto.biometricsEnabled !== undefined) {
      // Device verifies biometrics; backend stores preference.
      user.biometricsEnabled = dto.biometricsEnabled;
    }

    return this.userRepo.save(user);
  }

  /**
   * Change password with strong security:
   * - verify old password
   * - new==confirm
   * - strong password rule
   * - set mustChangePassword=false after success
   * - revoke other sessions (for PRINCIPAL/TEACHER), keep current device session if deviceId is provided
   */
  async changePassword(current: RequestUser, dto: ChangePasswordDto): Promise<void> {
    const user = await this.getMe(current);

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    if (dto.newPassword === dto.oldPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    if (!ChangePasswordDto.isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'Password must include uppercase, lowercase, number, and special character',
      );
    }

    const oldOk = await verifyPassword(dto.oldPassword, user.passwordHash);
    if (!oldOk) {
      throw new BadRequestException('Old password is incorrect');
    }

    const rounds = Number(this.config.get<number>('security.bcryptSaltRounds') ?? 12);
    user.passwordHash = await hashPassword(dto.newPassword, rounds);

    // After first login reset, this must be disabled
    user.mustChangePassword = false;

    await this.userRepo.save(user);

    // Revoke other active sessions for principal/teacher for high security.
    // (Student can have multiple sessions -> do not revoke)
    if (user.role === Role.PRINCIPAL || user.role === Role.TEACHER) {
      await this.revokeOtherSessions(user.id, current.deviceId ?? null);
    }
  }

  private async revokeOtherSessions(userId: string, currentDeviceId: string | null): Promise<void> {
    // auth_sessions table exists from migration.
    // If currentDeviceId is provided -> keep that device session active.
    // Else -> revoke all sessions (force re-login everywhere).
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      if (currentDeviceId) {
        await qr.query(
          `
          UPDATE auth_sessions
          SET is_active=false, revoked_at=now(), updated_at=now()
          WHERE user_id=$1 AND is_active=true AND device_id <> $2;
          `,
          [userId, currentDeviceId],
        );
      } else {
        await qr.query(
          `
          UPDATE auth_sessions
          SET is_active=false, revoked_at=now(), updated_at=now()
          WHERE user_id=$1 AND is_active=true;
          `,
          [userId],
        );
      }
    } finally {
      await qr.release();
    }
  }
}
