import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';

function createAuthServiceStub() {
  return {
    startGoogleAuth: vi.fn().mockReturnValue('http://google.local/auth'),
    handleGoogleCallback: vi.fn().mockResolvedValue({
      user: { id: 1, name: 'User', email: 'user@example.com', image: null, googleSub: null },
      sessionToken: 'session-token',
      redirectTo: 'http://frontend.local/home',
    }),
    getCurrentUser: vi.fn().mockResolvedValue({ id: 1, name: 'User', email: 'user@example.com', image: null, googleSub: null }),
    buildLogoutCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: false, sameSite: 'lax' as const }),
    buildSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: false, sameSite: 'lax' as const }),
  };
}

describe('auth routes', () => {
  it('redirects to Google start', async () => {
    const authService = createAuthServiceStub();
    const app = createApp(authService as never);

    const response = await request(app).get('/auth/google/start').redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('http://google.local/auth');
  });

  it('handles the Google callback', async () => {
    const authService = createAuthServiceStub();
    const app = createApp(authService as never);

    const response = await request(app).get('/auth/google/callback?code=code-123').redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('http://frontend.local/home');
    expect(response.headers['set-cookie'][0]).toContain('session=session-token');
    expect(authService.buildSessionCookieOptions).toHaveBeenCalledOnce();
  });

  it('returns the current user', async () => {
    const authService = createAuthServiceStub();
    const app = createApp(authService as never);

    const response = await request(app).get('/auth/me').set('Cookie', ['session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { id: 1, name: 'User', email: 'user@example.com', image: null, googleSub: null },
    });
  });

  it('logs out the current session', async () => {
    const authService = createAuthServiceStub();
    const app = createApp(authService as never);

    const response = await request(app).post('/auth/logout');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(authService.buildLogoutCookieOptions).toHaveBeenCalledOnce();
    expect(response.headers['set-cookie'][0]).toContain('session=;');
    expect(response.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });
});
