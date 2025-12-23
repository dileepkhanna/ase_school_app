import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { AuthSession } from '../entities/session.entity';
import { RequestUser } from '../../../common/types/request-user.type';
import { Role } from '../../../common/enums/role.enum';

export type AccessTokenPayload = {
  sub: string; // userId
  role: Role;
  schoolId: string | null;
  schoolCode: string | null;
  email: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession) private readonly sessionRepo: Repository<AuthSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('security.jwtAccessSecret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('Invalid token');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account disabled or not found');

    // If token carries deviceId, require active session for that device.
    // This makes "single-device login" enforcement real (revoked session -> access denied).
    const deviceId = payload.deviceId ?? null;

    // ASE_ADMIN may not use sessions (depends on admin panel); we allow either.
    if (user.role !== Role.ASE_ADMIN) {
      if (!deviceId) throw new UnauthorizedException('Device binding missing');

      const session = await this.sessionRepo.findOne({
        where: { userId: user.id, deviceId, isActive: true },
      });
      if (!session) throw new UnauthorizedException('Session revoked. Please login again.');
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
