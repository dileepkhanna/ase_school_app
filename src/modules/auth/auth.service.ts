import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';

import { AuthSession } from './entities/session.entity';
import { AuthOtp } from './entities/otp.entity';

import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

import {
  generateNumericOtp,
  hashOtp,
  hashPassword,
  randomHex,
  verifyPassword,
} from '../../common/utils/crypto.util';
import { distanceMeters, formatDistance } from '../../common/utils/geo.util';
import { MailService } from '../../integrations/mail/mail.service';
import { FcmService } from '../../integrations/firebase/fcm.service';
import { RequestUser } from '../../common/types/request-user.type';
import {
  DEFAULT_OTP_COOLDOWN_SECONDS,
  DEFAULT_OTP_LENGTH,
  DEFAULT_OTP_MAX_ATTEMPTS,
  DEFAULT_OTP_TTL_SECONDS,
} from '../../config/constants';
import { todayUtcDateOnly } from '../../common/utils/date.util';

type Tokens = {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  role: Role;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly fcm: FcmService,

    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(AuthSession) private readonly sessionRepo: Repository<AuthSession>,
    @InjectRepository(AuthOtp) private readonly otpRepo: Repository<AuthOtp>,
  ) {}

  // -------------------------
  // Login
  // -------------------------
  async login(dto: LoginDto): Promise<Tokens> {
    const schoolCode = dto.schoolCode.trim().toUpperCase();
    const email = dto.email.trim().toLowerCase();
    const deviceId = dto.deviceId.trim();

    const user = await this.userRepo.findOne({
      where: { email, schoolCode },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Strict: Login must be schoolCode + email + password
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Teacher Geo Restriction (only teacher)
    if (user.role === Role.TEACHER) {
      await this.enforceTeacherGeoLogin({
        user,
        schoolCode,
        lat: dto.lat,
        lng: dto.lng,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // Single-device policy:
    // - Principal & Teacher: revoke all previous active sessions
    // - Student: allow multiple devices
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      if (user.role === Role.PRINCIPAL || user.role === Role.TEACHER) {
        await qr.query(
          `
          UPDATE auth_sessions
          SET is_active=false, revoked_at=now(), updated_at=now()
          WHERE user_id=$1 AND is_active=true;
          `,
          [user.id],
        );
      }

      // Create/Update session for this device
      const refreshToken = await this.signRefreshToken(user, deviceId);
      const refreshHash = sha256(refreshToken);

      const existing = await this.sessionRepo.findOne({
        where: { userId: user.id, deviceId },
      });

      if (existing) {
        existing.refreshTokenHash = refreshHash;
        existing.isActive = true;
        existing.revokedAt = null;
        await qr.manager.getRepository(AuthSession).save(existing);
      } else {
        const s = qr.manager.getRepository(AuthSession).create({
          userId: user.id,
          deviceId,
          refreshTokenHash: refreshHash,
          isActive: true,
          revokedAt: null,
        });
        await qr.manager.getRepository(AuthSession).save(s);
      }

      // Upsert device token if provided
      if (dto.fcmToken) {
        await this.upsertDeviceToken({
          userId: user.id,
          deviceId,
          fcmToken: dto.fcmToken,
          platform: dto.platform,
        }, qr);
      }

      await qr.commitTransaction();

      const accessToken = await this.signAccessToken(user, deviceId);

      return {
        accessToken,
        refreshToken,
        mustChangePassword: user.mustChangePassword,
        role: user.role,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // -------------------------
  // Refresh (rotate refresh token)
  // -------------------------
  async refresh(current: RequestUser, dto: RefreshDto): Promise<Tokens> {
    if (!current.deviceId) throw new UnauthorizedException('Device binding missing');

    const user = await this.userRepo.findOne({ where: { id: current.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account not found');

    // Strategy already validated refresh token hash matches session.
    // Rotate refresh token for better security:
    const newRefresh = await this.signRefreshToken(user, current.deviceId);
    const newHash = sha256(newRefresh);

    await this.sessionRepo.update(
      { userId: user.id, deviceId: current.deviceId, isActive: true },
      { refreshTokenHash: newHash },
    );

    const accessToken = await this.signAccessToken(user, current.deviceId);

    // Optional: update device token if sent in future (dto currently doesn't include fcm)
    void dto;

    return {
      accessToken,
      refreshToken: newRefresh,
      mustChangePassword: user.mustChangePassword,
      role: user.role,
    };
  }

  // -------------------------
  // Logout
  // -------------------------
  async logout(current: RequestUser, dto: LogoutDto): Promise<void> {
    if (!current.userId) throw new UnauthorizedException();

    const deviceId = dto.deviceId?.trim();
    if (!deviceId) throw new BadRequestException('deviceId required');

    if (dto.allDevices) {
      await this.sessionRepo.update(
        { userId: current.userId, isActive: true },
        { isActive: false, revokedAt: new Date() },
      );
      return;
    }

    await this.sessionRepo.update(
      { userId: current.userId, deviceId, isActive: true },
      { isActive: false, revokedAt: new Date() },
    );
  }

  // -------------------------
  // Register device token (FCM)
  // -------------------------
  async registerDevice(current: RequestUser, dto: RegisterDeviceDto): Promise<void> {
    if (!current.deviceId) throw new UnauthorizedException('Device binding missing');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();
      await this.upsertDeviceToken(
        {
          userId: current.userId,
          deviceId: dto.deviceId,
          fcmToken: dto.fcmToken,
          platform: dto.platform,
        },
        qr,
      );
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // -------------------------
  // Forgot password -> send OTP
  // (returns generic success to avoid user enumeration)
  // -------------------------
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const schoolCode = dto.schoolCode.trim().toUpperCase();
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepo.findOne({ where: { schoolCode, email } });
    if (!user || !user.isActive) {
      // Generic success (anti-enumeration)
      return;
    }

    // Cooldown + last OTP record
    const lastOtp = await this.otpRepo.findOne({
      where: { userId: user.id, email },
      order: { createdAt: 'DESC' },
    });

    const cooldownSeconds =
      Number(this.config.get<number>('otp.cooldownSeconds')) || DEFAULT_OTP_COOLDOWN_SECONDS;

    if (lastOtp?.cooldownUntil && lastOtp.cooldownUntil.getTime() > Date.now()) {
      // Don’t reveal cooldown details
      return;
    }

    const length = Number(this.config.get<number>('otp.length')) || DEFAULT_OTP_LENGTH;
    const ttlSeconds = Number(this.config.get<number>('otp.ttlSeconds')) || DEFAULT_OTP_TTL_SECONDS;
    const maxAttempts =
      Number(this.config.get<number>('otp.maxAttempts')) || DEFAULT_OTP_MAX_ATTEMPTS;

    const rawOtp = generateNumericOtp(length);
    const salt = randomHex(16);
    const otpHash = hashOtp(rawOtp, salt);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000);

    const record = this.otpRepo.create({
      userId: user.id,
      email,
      otpHash,
      otpSalt: salt,
      attempts: 0,
      maxAttempts,
      expiresAt,
      cooldownUntil,
      usedAt: null,
    });

    await this.otpRepo.save(record);

    // Send OTP email
    await this.mail.sendOtpEmail({
      to: email,
      otp: rawOtp,
      ttlSeconds,
      schoolCode,
    });
  }

  // -------------------------
  // Verify OTP (optional step)
  // -------------------------
  async verifyOtp(dto: VerifyOtpDto): Promise<{ valid: boolean }> {
    const schoolCode = dto.schoolCode.trim().toUpperCase();
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepo.findOne({ where: { schoolCode, email } });
    if (!user || !user.isActive) return { valid: false };

    const otpRow = await this.getLatestOtpRow(user.id, email);
    if (!otpRow) return { valid: false };

    const valid = await this.checkOtpAndUpdateAttempts(otpRow, dto.otp);
    return { valid };
  }

  // -------------------------
  // Reset password with OTP
  // -------------------------
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const schoolCode = dto.schoolCode.trim().toUpperCase();
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepo.findOne({ where: { schoolCode, email } });
    if (!user || !user.isActive) {
      // generic
      return;
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    if (!ResetPasswordDto.isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'Password must include uppercase, lowercase, number, and special character',
      );
    }

    const otpRow = await this.getLatestOtpRow(user.id, email);
    if (!otpRow) throw new BadRequestException('Invalid or expired OTP');

    const ok = await this.checkOtpAndUpdateAttempts(otpRow, dto.otp);
    if (!ok) throw new BadRequestException('Invalid or expired OTP');

    const rounds = Number(this.config.get<number>('security.bcryptSaltRounds') ?? 12);
    const newHash = await hashPassword(dto.newPassword, rounds);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      // mark OTP used
      await qr.query(
        `UPDATE auth_otps SET used_at=now() WHERE id=$1;`,
        [otpRow.id],
      );

      // update password + clear must_change_password
      await qr.query(
        `
        UPDATE users
        SET password_hash=$1, must_change_password=false, updated_at=now()
        WHERE id=$2;
        `,
        [newHash, user.id],
      );

      // revoke sessions for principal/teacher (high security)
      if (user.role === Role.PRINCIPAL || user.role === Role.TEACHER) {
        await qr.query(
          `
          UPDATE auth_sessions
          SET is_active=false, revoked_at=now(), updated_at=now()
          WHERE user_id=$1 AND is_active=true;
          `,
          [user.id],
        );
      }

      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // =========================================================
  // Internal helpers
  // =========================================================

  private async signAccessToken(user: User, deviceId: string): Promise<string> {
    const expiresIn = this.config.get<string>('security.jwtAccessExpiresIn') ?? '15m';
    return this.jwt.signAsync(
      {
        sub: user.id,
        role: user.role,
        schoolId: user.schoolId,
        schoolCode: user.schoolCode,
        email: user.email,
        deviceId,
      },
      {
        secret: this.config.get<string>('security.jwtAccessSecret')!,
        expiresIn,
      },
    );
  }

  private async signRefreshToken(user: User, deviceId: string): Promise<string> {
    const expiresIn = this.config.get<string>('security.jwtRefreshExpiresIn') ?? '30d';
    return this.jwt.signAsync(
      {
        sub: user.id,
        deviceId,
      },
      {
        secret: this.config.get<string>('security.jwtRefreshSecret')!,
        expiresIn,
      },
    );
  }

  private async getLatestOtpRow(userId: string, email: string): Promise<AuthOtp | null> {
    const row = await this.otpRepo.findOne({
      where: { userId, email },
      order: { createdAt: 'DESC' },
    });

    if (!row) return null;
    if (row.usedAt) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;
    if (row.attempts >= row.maxAttempts) return null;

    return row;
  }

  private async checkOtpAndUpdateAttempts(row: AuthOtp, inputOtp: string): Promise<boolean> {
    // expired/used check
    if (row.usedAt) return false;
    if (row.expiresAt.getTime() < Date.now()) return false;
    if (row.attempts >= row.maxAttempts) return false;

    const incomingHash = hashOtp(inputOtp, row.otpSalt);

    if (incomingHash !== row.otpHash) {
      // increment attempts
      row.attempts += 1;
      await this.otpRepo.save(row);
      return false;
    }

    return true;
  }

  private async enforceTeacherGeoLogin(params: {
    user: User;
    schoolCode: string;
    lat?: number;
    lng?: number;
  }): Promise<void> {
    const { user, schoolCode, lat, lng } = params;

    if (lat === undefined || lng === undefined) {
      // Client must send location for teacher login
      await this.createGeoSecurityAlert({
        schoolId: user.schoolId!,
        teacherUserId: user.id,
        teacherName: user.email, // fallback; real teacher profile will supply name later
        distanceM: null,
        attemptedLat: null,
        attemptedLng: null,
        message: 'Teacher login blocked: location not provided.',
      });
      throw new ForbiddenException('Login allowed only inside the school boundary.');
    }

    if (!user.schoolId) throw new ForbiddenException('School scope missing');

    const school = await this.schoolRepo.findOne({ where: { id: user.schoolId } });
    if (!school || !school.isActive) throw new ForbiddenException('School inactive');

    // If geofence not configured, block for safety (you can change this if desired)
    if (
      school.geofenceLat === null ||
      school.geofenceLng === null ||
      school.geofenceRadiusM === null
    ) {
      await this.createGeoSecurityAlert({
        schoolId: user.schoolId,
        teacherUserId: user.id,
        teacherName: user.email,
        distanceM: null,
        attemptedLat: lat,
        attemptedLng: lng,
        message: 'Teacher login blocked: school geofence not configured.',
      });
      throw new ForbiddenException('Login allowed only inside the school boundary.');
    }

    const dist = distanceMeters(
      { lat: school.geofenceLat, lng: school.geofenceLng },
      { lat, lng },
    );

    if (dist > school.geofenceRadiusM) {
      const message = `Teacher attempted login from ${formatDistance(dist)} away from the school boundary.`;

      await this.createGeoSecurityAlert({
        schoolId: user.schoolId,
        teacherUserId: user.id,
        teacherName: user.email,
        distanceM: Math.round(dist),
        attemptedLat: lat,
        attemptedLng: lng,
        message,
      });

      // Push to principals (best-effort)
      await this.notifyPrincipalsSecurityAlert({
        schoolId: user.schoolId,
        title: 'Security Alert',
        body: `${user.email} attempted login from ${formatDistance(dist)} away`,
      });

      throw new ForbiddenException('Login allowed only inside the school boundary.');
    }

    // Optional: you can record "successful teacher geo login" analytics later
    void schoolCode;
  }

  private async createGeoSecurityAlert(params: {
    schoolId: string;
    teacherUserId: string;
    teacherName: string;
    distanceM: number | null;
    attemptedLat: number | null;
    attemptedLng: number | null;
    message: string;
  }): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(
        `
        INSERT INTO security_alerts
          (school_id, teacher_user_id, teacher_name, type, message, distance_m, attempted_lat, attempted_lng, status, created_at)
        VALUES
          ($1, $2, $3, 'GEO_LOGIN_ATTEMPT', $4, $5, $6, $7, 'NEW', now());
        `,
        [
          params.schoolId,
          params.teacherUserId,
          params.teacherName,
          params.message,
          params.distanceM,
          params.attemptedLat,
          params.attemptedLng,
        ],
      );
    } finally {
      await qr.release();
    }
  }

  private async notifyPrincipalsSecurityAlert(params: {
    schoolId: string;
    title: string;
    body: string;
  }): Promise<void> {
    // Find principal users
    const principals = await this.userRepo.find({
      where: { schoolId: params.schoolId, role: Role.PRINCIPAL, isActive: true },
      select: ['id'],
    });

    if (!principals.length) return;

    const principalIds = principals.map((p) => p.id);

    // Fetch their device tokens (raw SQL - matches migration)
    const rows: Array<{ fcm_token: string }> = await this.dataSource.query(
      `
      SELECT DISTINCT dt.fcm_token
      FROM device_tokens dt
      WHERE dt.user_id = ANY($1::uuid[]);
      `,
      [principalIds],
    );

    const tokens = rows.map((r) => r.fcm_token).filter(Boolean);
    if (tokens.length && this.fcm.isEnabled()) {
      await this.fcm.sendToTokens(tokens, {
        title: params.title,
        body: params.body,
        data: {
          type: 'SECURITY_ALERT',
          date: todayUtcDateOnly(),
        },
      });
    }

    // Also store a notification feed item for each principal (optional but useful)
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();
      for (const pid of principalIds) {
        await qr.query(
          `
          INSERT INTO notifications (school_id, user_id, title, body, image_url, data, is_read, created_at)
          VALUES ($1, $2, $3, $4, NULL, $5::jsonb, false, now());
          `,
          [
            params.schoolId,
            pid,
            params.title,
            params.body,
            JSON.stringify({ type: 'SECURITY_ALERT' }),
          ],
        );
      }
      await qr.commitTransaction();
    } catch {
      await qr.rollbackTransaction();
    } finally {
      await qr.release();
    }
  }

  private async upsertDeviceToken(
    params: { userId: string; deviceId: string; fcmToken: string; platform?: string },
    qr: any,
  ): Promise<void> {
    await qr.query(
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
