import { describe, expect, it } from 'vitest';
import { signSessionToken, verifySessionToken } from '../../src/auth/jwt';

describe('jwt helpers', () => {
  it('signs and verifies session payloads', () => {
    const token = signSessionToken({ userId: 123 }, 'secret-key', '1h');

    expect(verifySessionToken(token, 'secret-key')).toEqual({ userId: 123 });
  });

  it('returns null for invalid tokens', () => {
    expect(verifySessionToken('not-a-token', 'secret-key')).toBeNull();
  });
});
