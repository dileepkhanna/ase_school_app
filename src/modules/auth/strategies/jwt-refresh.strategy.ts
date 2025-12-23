import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { AuthSession } from '../entities/session.entity';
import { RequestUser } from '../../../common/types/request-user.type';

export type RefreshTokenPayload = {
  sub: string; // userId
  deviceId: string;
  iat?: number;
  exp?: number;
};

function extractRefreshToken(req: any): string | null {
  // Prefer body.refreshToken (your RefreshDto sends it in body)
  const bodyToken = req?.body?.refreshToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim();

  // Fallback: Authorization: Bearer <refreshToken>
  const auth = req?.headers?.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const t = auth.slice('Bearer '.length).trim();
    return t || null;
  }
  return null;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession) private readonly sessionRepo: Repository<AuthSession>,
  ) {
    super({
      // jwtFromRequest: (req) => extractRefreshToken(req),
      jwtFromRequest: (req: Request) => extractRefreshToken(req),
      secretOrKey: config.get<string>('security.jwtRefreshSecret'),
      ignoreExpiration: false,
      passReqToCallback: true, // so we can compare raw refresh token hash with DB
    });
  }

  async validate(req: any, payload: RefreshTokenPayload): Promise<RequestUser> {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const userId = payload.sub;
    const deviceId = payload.deviceId;
    if (!userId || !deviceId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account disabled or not found');

    // Must have an active session bound to this device, and refresh token hash must match
    const session = await this.sessionRepo.findOne({
      where: { userId: user.id, deviceId, isActive: true },
    });

    if (!session) throw new UnauthorizedException('Session revoked. Please login again.');

    const incomingHash = hashRefreshToken(refreshToken);
    if (incomingHash !== session.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId,
      schoolCode: user.schoolCode,
      email: user.email,
      deviceId,
      mustChangePassword: user.mustChangePassword,
      biometricsEnabled: user.biometricsEnabled,
      isActive: user.isActive,
    };
  }
}
