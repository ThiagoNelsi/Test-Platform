import { describe, expect, it, vi } from 'vitest';
import { buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleCallbackUrl, getGoogleUser } from '../../src/auth/oauth';

function createResponse(data: unknown, ok = true, statusText = 'OK') {
  return {
    ok,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

describe('oauth helpers', () => {
  it('builds the Google callback URL', () => {
    expect(getGoogleCallbackUrl('http://backend.local/')).toBe('http://backend.local/auth/google/callback');
  });

  it('builds the Google auth URL', () => {
    const url = buildGoogleAuthUrl({
      clientId: 'client-123',
      backendUrl: 'http://backend.local',
      state: 'state-456',
    });

    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('client-123');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://backend.local/auth/google/callback');
    expect(parsed.searchParams.get('state')).toBe('state-456');
  });

  it('exchanges the authorization code for tokens', async () => {
    const fetchFn = vi.fn().mockResolvedValue(createResponse({ access_token: 'access-123' }));

    const result = await exchangeCodeForTokens(fetchFn as never, {
      code: 'code-123',
      clientId: 'client-123',
      clientSecret: 'secret-456',
      backendUrl: 'http://backend.local',
    });

    expect(result).toEqual({ access_token: 'access-123' });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  });

  it('fetches the Google user profile', async () => {
    const fetchFn = vi.fn().mockResolvedValue(createResponse({ email: 'user@example.com', name: 'User' }));

    const result = await getGoogleUser(fetchFn as never, 'access-123');

    expect(result).toEqual({ email: 'user@example.com', name: 'User' });
    expect(fetchFn.mock.calls[0][0]).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
  });
});
