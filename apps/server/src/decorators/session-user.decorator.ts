import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { requireSessionUser } from '../utils/session-cookie';

/** Resolve the verified visitor at the HTTP boundary, before invoking business logic. */
export const SessionUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    requireSessionUser(context.switchToHttp().getRequest()),
);
