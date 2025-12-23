import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestUser } from '../types/request-user.type';
import { Role } from '../enums/role.enum';

/**
 * Multi-tenant safety guard:
 * - For PRINCIPAL/TEACHER/STUDENT: requires schoolId and schoolCode to exist.
 * - For ASE_ADMIN: allows without school scope (can manage global admin resources).
 *
 * Optional strict check:
 * If request includes a schoolCode (param/query/header), it must match the logged-in user's schoolCode.
 */
@Injectable()
export class SchoolScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;

    if (!user) throw new ForbiddenException('Unauthenticated');

    // ASE_ADMIN can access without school scope (admin panel).
    if (user.role === Role.ASE_ADMIN) return true;

    if (!user.schoolId || !user.schoolCode) {
      throw new ForbiddenException('School scope missing');
    }

    // If request explicitly specifies schoolCode anywhere, it must match.
    const paramSchoolCode = (req.params?.schoolCode as string | undefined) ?? undefined;
    const querySchoolCode = (req.query?.schoolCode as string | undefined) ?? undefined;

    const headerSchoolCodeRaw =
      (req.headers?.['x-school-code'] as string | undefined) ??
      (req.headers?.['X-School-Code'] as string | undefined);

    const headerSchoolCode = headerSchoolCodeRaw ? String(headerSchoolCodeRaw) : undefined;

    const requestedSchoolCode = (paramSchoolCode || querySchoolCode || headerSchoolCode)?.trim();
    if (requestedSchoolCode && requestedSchoolCode.toUpperCase() !== user.schoolCode.toUpperCase()) {
      throw new ForbiddenException('Cross-school access denied');
    }

    return true;
  }
}
