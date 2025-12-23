import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects refresh-token routes using the Refresh JWT strategy.
 * Strategy name: 'jwt-refresh'
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
