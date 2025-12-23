import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes using the Access JWT strategy.
 * Strategy name: 'jwt-access'
 */
@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {}
