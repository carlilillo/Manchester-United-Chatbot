import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../src/services/session.service';
import { SessionController } from '../src/controllers/session.controller';
import { COOKIE_NAME, requireSessionUser } from '../src/utils/session-cookie';

const userId = '0bd73289-d6cc-47ca-9f00-f586028648aa';

describe('anonymous session', () => {
  it('reuses a valid signed cookie without setting another', async () => {
    const repository = {
      findOneBy: vi.fn().mockResolvedValue({ id: userId }),
      create: vi.fn(),
      save: vi.fn(),
    };
    const controller = new SessionController(new SessionService(repository as never));
    const response = { cookie: vi.fn() };
    await expect(
      controller.start({ signedCookies: { [COOKIE_NAME]: userId } } as never, response as never),
    ).resolves.toEqual({ userId });
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('sets a signed, HTTP-only cookie for a new user', async () => {
    const repository = {
      findOneBy: vi.fn(),
      create: vi.fn().mockReturnValue({}),
      save: vi.fn().mockResolvedValue({ id: userId }),
    };
    const controller = new SessionController(new SessionService(repository as never));
    const response = { cookie: vi.fn() };
    await expect(
      controller.start({ signedCookies: {} } as never, response as never),
    ).resolves.toEqual({ userId });
    expect(response.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      userId,
      expect.objectContaining({ signed: true, httpOnly: true, sameSite: 'lax' }),
    );
  });

  it.each([undefined, false, 'invalid-uuid'])('rejects an invalid signed session: %s', (cookie) => {
    expect(() => requireSessionUser({ signedCookies: { [COOKIE_NAME]: cookie } } as never)).toThrow(
      UnauthorizedException,
    );
  });

  it('does not send a malformed identifier to a UUID database column', async () => {
    const repository = {
      findOneBy: vi.fn(),
      create: vi.fn().mockReturnValue({}),
      save: vi.fn().mockResolvedValue({ id: userId }),
    };
    await expect(new SessionService(repository as never).start('malformed')).resolves.toEqual({
      userId,
      created: true,
    });
    expect(repository.findOneBy).not.toHaveBeenCalled();
  });
});
