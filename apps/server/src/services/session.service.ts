import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { isSessionId } from '../utils/session-cookie';

@Injectable()
export class SessionService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  /** Reuse a known visitor; invalid or stale signed identifiers receive a new session. */
  async start(cookie: unknown): Promise<{ userId: string; created: boolean }> {
    if (isSessionId(cookie)) {
      const existing = await this.users.findOneBy({ id: cookie });
      if (existing) return { userId: existing.id, created: false };
    }

    const created = await this.users.save(this.users.create());
    return { userId: created.id, created: true };
  }
}
