import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}
  @Post() start(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.sessions.start(req, res); }
}
