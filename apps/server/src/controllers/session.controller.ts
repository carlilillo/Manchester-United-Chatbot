import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { COOKIE_NAME, sessionCookieOptions } from '../utils/session-cookie';

@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /** Set a signed cookie only when creating a visitor, retaining Nest's JSON response handling. */
  @Post()
  async start(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.sessions.start(request.signedCookies?.[COOKIE_NAME]);
    if (session.created) response.cookie(COOKIE_NAME, session.userId, sessionCookieOptions());
    return { userId: session.userId };
  }
}
