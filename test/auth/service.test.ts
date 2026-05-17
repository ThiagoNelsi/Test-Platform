import { describe, expect, it, vi } from 'vitest';
import { createAuthService, buildLogoutCookieOptions, buildSessionCookieOptions } from '../../src/auth/service';
import { signSessionToken, verifySessionToken } from '../../src/auth/jwt';

function createPrismaMock(existingUser = null as any) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(existingUser),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 7,
        ...data,
      })),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        name: existingUser?.name ?? 'Existing',
        email: existingUser?.email ?? 'user@example.com',
        image: existingUser?.image ?? null,
        googleSub: existingUser?.googleSub ?? null,
        ...data,
      })),
    },
  };
}

function createFetchSequence(responses: Array<Record<string, unknown>>) {
  const fetchFn = vi.fn();

  responses.forEach((response) => {
    fetchFn.mockResolvedValueOnce({
      ok: true,
      json: async () => response,
      text: async () => JSON.stringify(response),
    });
  });

  return fetchFn;
}

describe('auth service', () => {
  it('builds cookie options', () => {
    expect(buildSessionCookieOptions(false)).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax' });
    expect(buildLogoutCookieOptions(true)).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('creates a new user during Google callback', async () => {
    const fetchFn = createFetchSequence([
      { access_token: 'access-123' },
      { email: 'new@example.com', name: 'New User', picture: 'https://img.example/avatar.png', sub: 'google-sub' },
    ]);

    const prisma = createPrismaMock();

    const authService = createAuthService({
      prisma: prisma as never,
      fetchFn: fetchFn as never,
      jwtSecret: 'jwt-secret',
      googleClientId: 'client-123',
      googleClientSecret: 'secret-456',
      backendUrl: 'http://backend.local',
      frontendUrl: 'http://frontend.local',
      isProduction: false,
    });

    const result = await authService.handleGoogleCallback('code-123');

    expect(result.redirectTo).toBe('http://frontend.local');
    expect(result.user).toMatchObject({ id: 7, email: 'new@example.com', name: 'New User', image: 'https://img.example/avatar.png', googleSub: 'google-sub' });
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(verifySessionToken(result.sessionToken, 'jwt-secret')).toEqual({ userId: 7 });
  });

  it('updates an existing user and reads the session', async () => {
    const existingUser = {
      id: 11,
      name: 'Old Name',
      email: 'user@example.com',
      image: null,
      googleSub: null,
    };

    const prisma = createPrismaMock(existingUser);
    const fetchFn = createFetchSequence([
      { access_token: 'access-123' },
      { email: 'user@example.com', name: 'New Name', picture: 'https://img.example/new.png', sub: 'google-sub-2' },
    ]);

    const authService = createAuthService({
      prisma: prisma as never,
      fetchFn: fetchFn as never,
      jwtSecret: 'jwt-secret',
      googleClientId: 'client-123',
      googleClientSecret: 'secret-456',
      backendUrl: 'http://backend.local',
      frontendUrl: 'http://frontend.local',
      isProduction: true,
    });

    const result = await authService.handleGoogleCallback('code-123');
    const currentUser = await authService.getCurrentUser(signSessionToken({ userId: 11 }, 'jwt-secret'));

    expect(prisma.user.update).toHaveBeenCalledOnce();
    expect(result.user).toMatchObject({ id: 11, name: 'New Name', email: 'user@example.com', image: 'https://img.example/new.png', googleSub: 'google-sub-2' });
    expect(currentUser).toMatchObject({ id: 11, name: 'Old Name', email: 'user@example.com', image: null, googleSub: null });
  });

  it('returns null for invalid session tokens', async () => {
    const prisma = createPrismaMock();
    const authService = createAuthService({
      prisma: prisma as never,
      fetchFn: vi.fn() as never,
      jwtSecret: 'jwt-secret',
      googleClientId: 'client-123',
      googleClientSecret: 'secret-456',
      backendUrl: 'http://backend.local',
      frontendUrl: 'http://frontend.local',
      isProduction: false,
    });

    await expect(authService.getCurrentUser('invalid-token')).resolves.toBeNull();
  });
});
