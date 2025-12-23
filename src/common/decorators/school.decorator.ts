import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Returns schoolId from the authenticated user (RequestUser).
 * Useful in controllers/services to scope queries.
 */
export const SchoolId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
  const req = ctx.switchToHttp().getRequest();
  return req.user?.schoolId ?? null;
});

/**
 * Returns schoolCode from the authenticated user.
 */
export const SchoolCode = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
  const req = ctx.switchToHttp().getRequest();
  return req.user?.schoolCode ?? null;
});
