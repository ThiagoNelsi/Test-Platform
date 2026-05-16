import { describe, expect, it } from 'vitest';
import { getOptionalEnv, getRequiredEnv } from '../../src/config/env';

describe('env helpers', () => {
  it('returns required env values', () => {
    expect(getRequiredEnv('VALUE', { VALUE: 'ok' } as NodeJS.ProcessEnv)).toBe('ok');
  });

  it('throws when required env is missing', () => {
    expect(() => getRequiredEnv('VALUE', {} as NodeJS.ProcessEnv)).toThrow('VALUE not defined in .env');
  });

  it('returns optional env fallback', () => {
    expect(getOptionalEnv('VALUE', 'fallback', {} as NodeJS.ProcessEnv)).toBe('fallback');
  });
});
