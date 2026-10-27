import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService, COOKIE_NAME } from '../src/services/session.service';

describe('anonymous session', () => {
  it('reuses a valid signed cookie without setting another', async () => {
    const repository = { findOneBy: vi.fn().mockResolvedValue({ id: 'existing-user' }), create: vi.fn(), save: vi.fn() };
    const service = new SessionService({ getRepository: () => repository } as never);
    const response = { cookie: vi.fn() };
    await expect(service.start({ signedCookies: { [COOKIE_NAME]: 'existing-user' } } as never, response as never)).resolves.toEqual({ userId: 'existing-user' });
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('sets a signed, HTTP-only cookie for a new user', async () => {
    const repository = { findOneBy: vi.fn().mockResolvedValue(null), create: vi.fn().mockReturnValue({}), save: vi.fn().mockResolvedValue({ id: 'new-user' }) };
    const service = new SessionService({ getRepository: () => repository } as never);
    const response = { cookie: vi.fn() };
    await expect(service.start({ signedCookies: {} } as never, response as never)).resolves.toEqual({ userId: 'new-user' });
    expect(response.cookie).toHaveBeenCalledWith(COOKIE_NAME, 'new-user', expect.objectContaining({ signed: true, httpOnly: true, sameSite: 'lax' }));
    expect(() => service.requireUser({ signedCookies: {} } as never)).toThrow(UnauthorizedException);
  });
});
