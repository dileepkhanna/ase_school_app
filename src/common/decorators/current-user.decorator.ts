import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../types/request-user.type';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as RequestUser;
});
