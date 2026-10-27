import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Request, Response } from 'express';
import { UserEntity } from '../entities/user.entity';

export const COOKIE_NAME = 'united_session';
@Injectable()
export class SessionService {
  constructor(private readonly db: DataSource) {}
  async start(req: Request, res: Response): Promise<{ userId: string }> {
    const cookie = req.signedCookies?.[COOKIE_NAME];
    if (typeof cookie === 'string') {
      const existing = await this.db.getRepository(UserEntity).findOneBy({ id: cookie });
      if (existing) return { userId: existing.id };
    }
    const created = await this.db.getRepository(UserEntity).save(this.db.getRepository(UserEntity).create());
    res.cookie(COOKIE_NAME, created.id, { signed: true, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 365 * 24 * 60 * 60 * 1000, path: '/' });
    return { userId: created.id };
  }
  requireUser(req: Request): string {
    const cookie = req.signedCookies?.[COOKIE_NAME];
    if (typeof cookie !== 'string') throw new UnauthorizedException('Open the page to create a session');
    return cookie;
  }
}
